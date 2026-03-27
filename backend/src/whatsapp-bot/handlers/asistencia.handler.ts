import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappBotService } from '../whatsapp-bot.service';
import { AsistenciaService } from '../../asistencia/asistencia.service';
import {
  GamificacionService,
  AsignarPuntosResult,
} from '../../gamificacion/gamificacion.service';
import { RedisService } from '../../redis/redis.service';
import { ConversationContext } from '../dto';
import { getTodayAsUTC, getInicioSemana } from '../../common/utils';
import { normalizarTelefono } from '../utils/telefono.utils';

interface AsistenciaFlowData {
  codigoQR: string;
  qrId: number;
  tipoId: number;
  tipoNombre: string;
  campos: any[];
  campoActual: number;
  respuestas: Record<string, any>;
  // Campos para registro manual (admin/líder registra a otro)
  esManual?: boolean;
  usuarioObjetivoId?: number;
  telefonoRegistro?: string;
  nombreRegistro?: string;
}

@Injectable()
export class AsistenciaHandler {
  private readonly logger = new Logger(AsistenciaHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappBotService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => AsistenciaService))
    private readonly asistenciaService: AsistenciaService,
    @Inject(forwardRef(() => GamificacionService))
    private readonly gamificacionService: GamificacionService,
  ) {}

  /**
   * Buscar QR en la base de datos con fallback de formato antiguo (con guión)
   */
  private async findQRConFallback(codigoQR: string) {
    let qr = await this.prisma.qRAsistencia.findUnique({
      where: { codigo: codigoQR },
      include: {
        tipoAsistencia: {
          include: {
            campos: {
              where: { activo: true },
              orderBy: { orden: 'asc' },
            },
          },
        },
      },
    });

    // Si no encuentra, intentar con formato antiguo (con guión)
    if (!qr && codigoQR.startsWith('JA') && codigoQR.length === 10) {
      const codigoConGuion = `JA-${codigoQR.slice(2)}`;
      qr = await this.prisma.qRAsistencia.findUnique({
        where: { codigo: codigoConGuion },
        include: {
          tipoAsistencia: {
            include: {
              campos: {
                where: { activo: true },
                orderBy: { orden: 'asc' },
              },
            },
          },
        },
      });
    }

    return qr;
  }

  /**
   * Iniciar flujo de registro de asistencia
   */
  async handle(
    context: ConversationContext,
    entities: Record<string, any>,
    message: string,
  ): Promise<void> {
    const codigoQR = entities.codigoQR as string;

    if (!codigoQR) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content: '⚠️ No detecté un código QR válido. El formato es: JAXXXXXXXX',
      });
      return;
    }

    // Buscar QR en la base de datos (con fallback de formato antiguo)
    const qr = await this.findQRConFallback(codigoQR);

    if (!qr) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content:
          '❌ Código QR no válido. Verifica el código e intenta de nuevo.',
      });
      return;
    }

    if (!qr.activo) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content: '⏸️ Este código QR ya no está activo.',
      });
      return;
    }

    // Verificar horario (considerando margen temprano)
    const ahora = new Date();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
    const horaInicio =
      qr.horaInicio.getHours() * 60 + qr.horaInicio.getMinutes();
    const horaFin = qr.horaFin.getHours() * 60 + qr.horaFin.getMinutes();
    const margenTemprana = qr.margenTemprana ?? 15; // Default 15 minutos
    const horaInicioConMargen = horaInicio - margenTemprana;

    if (horaActual < horaInicioConMargen || horaActual >= horaFin) {
      const formatTime = (d: Date) =>
        `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      // Calcular hora de inicio con margen para mostrar en mensaje
      const horaInicioReal = new Date(qr.horaInicio);
      horaInicioReal.setMinutes(horaInicioReal.getMinutes() - margenTemprana);
      await this.whatsappService.sendMessage(context.conversationId, {
        content: `⏰ El registro de asistencia solo está disponible de ${formatTime(horaInicioReal)} a ${formatTime(qr.horaFin)}.`,
      });
      return;
    }

    // Verificar si ya registró en este QR específico (sin importar semana)
    const hoy = getTodayAsUTC();
    const semanaInicio = getInicioSemana(hoy);

    // Buscar usuario por teléfono para validar duplicados correctamente
    const usuarioExistente = await this.prisma.usuario.findFirst({
      where: {
        telefono: { endsWith: context.telefono.slice(-9) },
      },
    });

    // Validar duplicados tanto por usuarioId como por telefonoRegistro
    const existente = await this.prisma.asistencia.findFirst({
      where: {
        qrId: qr.id,
        OR: [
          { telefonoRegistro: context.telefono },
          ...(usuarioExistente ? [{ usuarioId: usuarioExistente.id }] : []),
        ],
      },
    });

    if (existente) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content: `✅ Ya registraste tu asistencia en este QR. ¡Dios te bendiga!`,
      });
      return;
    }

    // Si el tipo no requiere formulario, registrar directamente
    if (
      qr.tipoAsistencia?.soloPresencia ||
      !qr.tipoAsistencia?.campos?.length
    ) {
      await this.registrarAsistencia(context, qr);
      return;
    }

    // Iniciar flujo de formulario
    const flowData: AsistenciaFlowData = {
      codigoQR,
      qrId: qr.id,
      tipoId: qr.tipoId!,
      tipoNombre: qr.tipoAsistencia.label,
      campos: qr.tipoAsistencia.campos,
      campoActual: 0,
      respuestas: {},
    };

    // Guardar estado en contexto
    await this.updateConversationContext(context.telefono, {
      estado: 'formulario_asistencia',
      moduloActivo: 'asistencia',
      contexto: flowData,
    });

    // Enviar saludo y primera pregunta
    const saludos = [
      `¡Hola ${context.nombreWhatsapp}! 👋`,
      `Para *${qr.tipoAsistencia.label}* necesito algunos datos:`,
    ];
    await this.whatsappService.sendMessages(context.conversationId, saludos);

    // Enviar primera pregunta
    await this.sendQuestion(context.conversationId, flowData.campos[0]);
  }

  /**
   * Manejar registro manual de asistencia (admin/líder registra a otro usuario)
   */
  async handleManual(
    context: ConversationContext,
    entities: Record<string, any>,
    message: string,
  ): Promise<void> {
    const codigoQR = entities.codigoQR as string;
    const nombreUsuario = entities.nombreUsuario as string | undefined;
    const telefonoUsuario = entities.telefonoUsuario as string | undefined;

    if (!codigoQR) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content:
          '⚠️ Necesito el código QR para registrar la asistencia.\n\nEjemplo: _registrar asistencia de Juan en JAA1B2C3D4_',
      });
      return;
    }

    if (!nombreUsuario && !telefonoUsuario) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content:
          '⚠️ Necesito el nombre o teléfono del usuario a registrar.\n\nEjemplo: _registrar asistencia de Juan en JAA1B2C3D4_',
      });
      return;
    }

    // Buscar QR en la base de datos (con fallback de formato antiguo)
    const qr = await this.findQRConFallback(codigoQR);

    if (!qr) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content:
          '❌ Código QR no válido. Verifica el código e intenta de nuevo.',
      });
      return;
    }

    if (!qr.activo) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content: '⏸️ Este código QR ya no está activo.',
      });
      return;
    }

    // Verificar horario (considerando margen temprano)
    const ahora = new Date();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
    const horaInicio =
      qr.horaInicio.getHours() * 60 + qr.horaInicio.getMinutes();
    const horaFin = qr.horaFin.getHours() * 60 + qr.horaFin.getMinutes();
    const margenTemprana = qr.margenTemprana ?? 15; // Default 15 minutos
    const horaInicioConMargen = horaInicio - margenTemprana;

    if (horaActual < horaInicioConMargen || horaActual >= horaFin) {
      const formatTime = (d: Date) =>
        `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      // Calcular hora de inicio con margen para mostrar en mensaje
      const horaInicioReal = new Date(qr.horaInicio);
      horaInicioReal.setMinutes(horaInicioReal.getMinutes() - margenTemprana);
      await this.whatsappService.sendMessage(context.conversationId, {
        content: `⏰ El registro de asistencia solo está disponible de ${formatTime(horaInicioReal)} a ${formatTime(qr.horaFin)}.`,
      });
      return;
    }

    // Buscar usuario objetivo por nombre o teléfono
    type UsuarioBasico = {
      id: number;
      nombre: string;
      telefono: string;
      codigoPais: string;
    };
    let usuarioObjetivo: UsuarioBasico | null = null;
    let telefonoRegistro = telefonoUsuario || '';
    let nombreRegistro = nombreUsuario || '';

    if (telefonoUsuario) {
      const telefonoLimpio = normalizarTelefono(telefonoUsuario);
      const found = await this.prisma.usuario.findFirst({
        where: {
          telefono: { endsWith: telefonoLimpio.slice(-9) },
        },
        select: { id: true, nombre: true, telefono: true, codigoPais: true },
      });
      usuarioObjetivo = found;
      telefonoRegistro = telefonoLimpio;
      if (usuarioObjetivo) {
        nombreRegistro = usuarioObjetivo.nombre;
      }
    } else if (nombreUsuario) {
      // Buscar por nombre (búsqueda aproximada)
      const usuarios = await this.prisma.usuario.findMany({
        where: {
          nombre: { contains: nombreUsuario, mode: 'insensitive' },
          activo: true,
        },
        select: { id: true, nombre: true, telefono: true, codigoPais: true },
        take: 5,
      });

      if (usuarios.length === 1) {
        usuarioObjetivo = usuarios[0];
        telefonoRegistro = usuarioObjetivo.telefono;
        nombreRegistro = usuarioObjetivo.nombre;
      } else if (usuarios.length > 1) {
        // Múltiples coincidencias - mostrar lista interactiva
        await this.whatsappService.sendInteractiveList(
          context.conversationId,
          `⚠️ Encontré ${usuarios.length} usuarios con ese nombre:`,
          'Seleccionar',
          [
            {
              title: 'Usuarios encontrados',
              rows: usuarios.map((u) => ({
                id: `user_${u.id}`,
                title: u.nombre,
                description: u.telefono,
              })),
            },
          ],
        );
        return;
      }
      // Si no encuentra usuario, usará el nombre proporcionado
    }

    // Verificar si ya registró en este QR específico (sin importar semana)
    const hoy = getTodayAsUTC();
    const semanaInicio = getInicioSemana(hoy);

    // Validar duplicados tanto por usuarioId como por telefonoRegistro
    const orConditions: any[] = [];

    if (usuarioObjetivo) {
      orConditions.push({ usuarioId: usuarioObjetivo.id });
      // También buscar si el bot ya registró con el teléfono del usuario
      orConditions.push({ telefonoRegistro: usuarioObjetivo.telefono });
      orConditions.push({
        telefonoRegistro: { endsWith: usuarioObjetivo.telefono.slice(-9) },
      });
    }
    if (telefonoRegistro) {
      orConditions.push({ telefonoRegistro });
      orConditions.push({
        telefonoRegistro: { endsWith: telefonoRegistro.slice(-9) },
      });
    }
    if (!usuarioObjetivo && !telefonoRegistro && nombreRegistro) {
      orConditions.push({ nombreRegistro });
    }

    const existente =
      orConditions.length > 0
        ? await this.prisma.asistencia.findFirst({
            where: {
              qrId: qr.id,
              OR: orConditions,
            },
          })
        : null;

    if (existente) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content: `⚠️ ${nombreRegistro || 'Este usuario'} ya tiene asistencia registrada en este QR.`,
      });
      return;
    }

    // Si el tipo no requiere formulario o es solo presencia, registrar directamente
    if (
      qr.tipoAsistencia?.soloPresencia ||
      !qr.tipoAsistencia?.campos?.length
    ) {
      await this.registrarAsistenciaManual(
        context,
        qr,
        usuarioObjetivo,
        telefonoRegistro,
        nombreRegistro,
      );
      return;
    }

    // Si requiere formulario, iniciar flujo
    const flowData = {
      codigoQR,
      qrId: qr.id,
      tipoId: qr.tipoId!,
      tipoNombre: qr.tipoAsistencia.label,
      campos: qr.tipoAsistencia.campos,
      campoActual: 0,
      respuestas: {},
      // Datos del usuario objetivo para registro manual
      esManual: true,
      usuarioObjetivoId: usuarioObjetivo?.id,
      telefonoRegistro,
      nombreRegistro,
    };

    await this.updateConversationContext(context.telefono, {
      estado: 'formulario_asistencia_manual',
      moduloActivo: 'asistencia',
      contexto: flowData,
    });

    const saludos = [
      `📝 Registrando asistencia de *${nombreRegistro || telefonoRegistro}*`,
      `Para *${qr.tipoAsistencia.label}* necesito algunos datos:`,
    ];
    await this.whatsappService.sendMessages(context.conversationId, saludos);

    await this.sendQuestion(context.conversationId, flowData.campos[0]);
  }

  /**
   * Registrar asistencia manual (para otro usuario)
   */
  private async registrarAsistenciaManual(
    context: ConversationContext,
    qr: any,
    usuarioObjetivo: any,
    telefonoRegistro: string,
    nombreRegistro: string,
    datosFormulario?: Record<string, any>,
  ): Promise<void> {
    const hoy = getTodayAsUTC();
    const semanaInicio = getInicioSemana(hoy);

    try {
      const asistencia: any = await this.asistenciaService.crearAsistencia({
        usuarioId: usuarioObjetivo?.id,
        telefonoRegistro: telefonoRegistro || null,
        nombreRegistro: nombreRegistro || null,
        tipoId: qr.tipoId,
        fecha: hoy,
        fechaEvento: qr.semanaInicio,
        semanaInicio,
        datosFormulario: datosFormulario,
        metodoRegistro: 'manual',
        estado: 'confirmado',
        qrId: qr.id,
        confirmadoPor: context.usuarioId,
        confirmadoAt: new Date(),
        include: 'tipo',
      });

      // Asignar puntos de gamificación si el usuario está registrado
      let gamificacionResult: AsignarPuntosResult | null = null;
      if (usuarioObjetivo?.id) {
        try {
          const margenTemprana = qr.margenTemprana ?? 15;
          const margenTardia = qr.margenTardia ?? 30;

          gamificacionResult =
            await this.gamificacionService.asignarPuntosPorAsistencia(
              usuarioObjetivo.id,
              asistencia.id,
              asistencia.createdAt,
              qr.horaInicio,
              margenTemprana,
              margenTardia,
              undefined,
              qr,
            );
          this.logger.log(
            `Puntos asignados a usuario ${usuarioObjetivo.id}: ${gamificacionResult?.puntosAsignados || 0}`,
          );
        } catch (gamError) {
          this.logger.error(`Error asignando puntos: ${gamError.message}`);
        }
      }

      let mensaje = `✅ *¡Asistencia registrada!*\n\n`;
      mensaje += `📋 ${qr.tipoAsistencia?.label || 'Asistencia'}\n`;
      mensaje += `👤 ${nombreRegistro || telefonoRegistro}\n`;
      mensaje += `📅 ${hoy.toLocaleDateString('es-PE')}\n`;
      mensaje += `✍️ Registrado por: ${context.nombreWhatsapp}\n`;

      // Mostrar puntos ganados si aplica
      if (gamificacionResult?.puntosAsignados) {
        mensaje += `\n🎮 *+${gamificacionResult.puntosAsignados} puntos*\n`;
        if (gamificacionResult.nuevoNivel) {
          mensaje += `🎉 *¡Subió a nivel ${gamificacionResult.nivelActual.nombre}!*\n`;
        }
      }

      if (datosFormulario && Object.keys(datosFormulario).length > 0) {
        mensaje += `\n📝 *Datos registrados:*\n`;
        for (const [key, value] of Object.entries(datosFormulario)) {
          const campo = qr.tipoAsistencia?.campos?.find(
            (c: any) => c.nombre === key,
          );
          const label = campo?.label || key;
          mensaje += `   • ${label}: ${value}\n`;
        }
      }

      await this.whatsappService.sendMessage(context.conversationId, {
        content: mensaje,
      });
      await this.resetContext(context.telefono);

      // Emitir evento WebSocket
      const asistenciaFormatted = {
        id: asistencia.id,
        usuario: usuarioObjetivo
          ? {
              id: usuarioObjetivo.id,
              nombre: usuarioObjetivo.nombre,
              codigoPais: usuarioObjetivo.codigoPais,
              telefono: usuarioObjetivo.telefono,
            }
          : null,
        telefonoRegistro,
        nombreRegistro,
        fecha: hoy,
        semanaInicio,
        datosFormulario: datosFormulario || {},
        metodoRegistro: 'manual',
        estado: 'confirmado',
        tipo: asistencia.tipo,
        createdAt: asistencia.createdAt,
      };
      await this.redisService.publish('asistencia:nueva', {
        qrCode: qr.codigo,
        asistencia: asistenciaFormatted,
      });
    } catch (error) {
      this.logger.error(
        `Error registrando asistencia manual: ${error.message}`,
      );

      if (error.code === 'P2002') {
        await this.whatsappService.sendMessage(context.conversationId, {
          content:
            '⚠️ Este usuario ya tiene asistencia registrada esta semana.',
        });
      } else {
        await this.whatsappService.sendMessage(context.conversationId, {
          content:
            '❌ Ocurrió un error al registrar la asistencia. Intenta de nuevo.',
        });
      }

      await this.resetContext(context.telefono);
    }
  }

  /**
   * Continuar flujo de formulario
   */
  async continueFlow(
    context: ConversationContext,
    message: string,
  ): Promise<void> {
    const flowData = context.datos as AsistenciaFlowData;

    if (!flowData || !flowData.campos) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content:
          '❌ Ocurrió un error. Por favor, envía el código QR nuevamente.',
      });
      await this.resetContext(context.telefono);
      return;
    }

    const campoActual = flowData.campos[flowData.campoActual];

    // Validar respuesta
    const validacion = this.validateResponse(message, campoActual);

    if (!validacion.valid) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content: validacion.error!,
      });
      return;
    }

    // Guardar respuesta
    flowData.respuestas[campoActual.nombre] = validacion.value;
    flowData.campoActual++;

    // Si hay más preguntas
    if (flowData.campoActual < flowData.campos.length) {
      await this.updateConversationContext(context.telefono, {
        contexto: flowData,
      });
      await this.sendQuestion(
        context.conversationId,
        flowData.campos[flowData.campoActual],
      );
      return;
    }

    // Formulario completado - registrar asistencia
    const qr = await this.prisma.qRAsistencia.findUnique({
      where: { id: flowData.qrId },
      include: { tipoAsistencia: true },
    });

    if (!qr) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content: '❌ Error: QR no encontrado.',
      });
      await this.resetContext(context.telefono);
      return;
    }

    // Si es registro manual (admin/líder registrando a otro usuario)
    if (flowData.esManual) {
      type UsuarioBasico = {
        id: number;
        nombre: string;
        telefono: string;
        codigoPais: string;
      };
      let usuarioObjetivo: UsuarioBasico | null = null;
      if (flowData.usuarioObjetivoId) {
        usuarioObjetivo = await this.prisma.usuario.findUnique({
          where: { id: flowData.usuarioObjetivoId },
          select: { id: true, nombre: true, telefono: true, codigoPais: true },
        });
      }
      await this.registrarAsistenciaManual(
        context,
        qr,
        usuarioObjetivo,
        flowData.telefonoRegistro || '',
        flowData.nombreRegistro || '',
        flowData.respuestas,
      );
      return;
    }

    await this.registrarAsistencia(context, qr, flowData.respuestas);
  }

  /**
   * Registrar asistencia en la base de datos
   */
  private async registrarAsistencia(
    context: ConversationContext,
    qr: any,
    datosFormulario?: Record<string, any>,
  ): Promise<void> {
    const hoy = getTodayAsUTC();
    const semanaInicio = getInicioSemana(hoy);

    try {
      // Buscar usuario por teléfono (si existe)
      const usuario = await this.prisma.usuario.findFirst({
        where: {
          telefono: { endsWith: context.telefono.slice(-9) },
        },
      });

      const asistencia: any = await this.asistenciaService.crearAsistencia({
        usuarioId: usuario?.id,
        telefonoRegistro: context.telefono,
        nombreRegistro: context.nombreWhatsapp,
        tipoId: qr.tipoId,
        fecha: hoy,
        fechaEvento: qr.semanaInicio,
        semanaInicio,
        datosFormulario: datosFormulario,
        metodoRegistro: 'qr_bot',
        estado: 'pendiente_confirmacion',
        qrId: qr.id,
        include: 'tipo',
      });

      // Enviar confirmación
      let mensaje = `✅ *¡Asistencia registrada!*\n\n`;
      mensaje += `📋 ${qr.tipoAsistencia?.label || 'Asistencia'}\n`;
      mensaje += `👤 ${context.nombreWhatsapp}\n`;
      mensaje += `📅 ${hoy.toLocaleDateString('es-PE')}\n`;

      if (datosFormulario && Object.keys(datosFormulario).length > 0) {
        mensaje += `\n📝 *Datos registrados:*\n`;
        for (const [key, value] of Object.entries(datosFormulario)) {
          const campo = qr.tipoAsistencia?.campos?.find(
            (c: any) => c.nombre === key,
          );
          const label = campo?.label || key;
          mensaje += `   • ${label}: ${value}\n`;
        }
      }

      mensaje += `\n¡Dios te bendiga! 🙏`;

      await this.whatsappService.sendMessage(context.conversationId, {
        content: mensaje,
      });

      // Resetear contexto
      await this.resetContext(context.telefono);

      // Emitir evento WebSocket para actualizar sala de asistencia
      const asistenciaFormatted = {
        id: asistencia.id,
        usuario: usuario
          ? {
              id: usuario.id,
              nombre: usuario.nombre,
              codigoPais: usuario.codigoPais,
              telefono: usuario.telefono,
            }
          : {
              id: 0,
              nombre: context.nombreWhatsapp,
              telefono: context.telefono,
            },
        fecha: hoy,
        semanaInicio,
        datosFormulario: datosFormulario || {},
        metodoRegistro: 'qr_bot',
        estado: 'pendiente_confirmacion',
        tipo: asistencia.tipo,
        createdAt: asistencia.createdAt,
      };
      await this.redisService.publish('asistencia:nueva', {
        qrCode: qr.codigo,
        asistencia: asistenciaFormatted,
      });
      this.logger.log(`WebSocket event emitted for QR: ${qr.codigo}`);
    } catch (error) {
      this.logger.error(`Error registrando asistencia: ${error.message}`);

      if (error.code === 'P2002') {
        await this.whatsappService.sendMessage(context.conversationId, {
          content: '⚠️ Ya registraste tu asistencia esta semana.',
        });
      } else {
        await this.whatsappService.sendMessage(context.conversationId, {
          content:
            '❌ Ocurrió un error al registrar tu asistencia. Intenta de nuevo.',
        });
      }

      await this.resetContext(context.telefono);
    }
  }

  /**
   * Enviar pregunta del formulario (con mensajes interactivos cuando aplica)
   */
  private async sendQuestion(
    conversationId: number,
    campo: any,
  ): Promise<void> {
    const label = `📝 *${campo.label}*`;
    const placeholder = campo.placeholder ? `\n_${campo.placeholder}_` : '';

    // Checkbox → Botones Sí / No
    if (campo.tipo === 'checkbox') {
      await this.whatsappService.sendInteractiveButtons(
        conversationId,
        `${label}${placeholder}`,
        [
          { id: 'cb_si', title: 'Sí' },
          { id: 'cb_no', title: 'No' },
        ],
      );
      return;
    }

    // Number con rango pequeño (max - min <= 10) → Lista interactiva
    if (
      campo.tipo === 'number' &&
      campo.valorMinimo !== null &&
      campo.valorMaximo !== null &&
      campo.valorMaximo - campo.valorMinimo <= 10
    ) {
      const min = campo.valorMinimo;
      const max = campo.valorMaximo;
      const rows: { id: string; title: string; description?: string }[] = [];
      for (let i = min; i <= max; i++) {
        rows.push({
          id: `num_${i}`,
          title: `${i} ${i === 1 ? 'día' : 'días'}`,
        });
      }

      await this.whatsappService.sendInteractiveList(
        conversationId,
        `${label}${placeholder}`,
        'Elegir',
        [{ title: campo.label, rows }],
      );
      return;
    }

    // Select con hasta 3 opciones → Botones
    if (campo.tipo === 'select' && campo.opciones) {
      const opciones = campo.opciones as { value: string; label: string }[];

      if (opciones.length <= 3) {
        await this.whatsappService.sendInteractiveButtons(
          conversationId,
          `${label}${placeholder}`,
          opciones.map((opt, i) => ({
            id: `sel_${i}`,
            title: opt.label,
          })),
        );
        return;
      }

      // Select con más de 3 opciones → Lista
      await this.whatsappService.sendInteractiveList(
        conversationId,
        `${label}${placeholder}`,
        'Seleccionar',
        [
          {
            title: campo.label,
            rows: opciones.map((opt, i) => ({
              id: `sel_${i}`,
              title: opt.label,
            })),
          },
        ],
      );
      return;
    }

    // Fallback: mensaje de texto para number sin rango definido o text
    let pregunta = label + placeholder;

    if (
      campo.tipo === 'number' &&
      (campo.valorMinimo !== null || campo.valorMaximo !== null)
    ) {
      const min = campo.valorMinimo ?? 0;
      const max = campo.valorMaximo ?? '∞';
      pregunta += `\n_(Valor entre ${min} y ${max})_`;
    }

    await this.whatsappService.sendMessage(conversationId, {
      content: pregunta,
    });
  }

  /**
   * Validar respuesta según tipo de campo
   */
  private validateResponse(
    response: string,
    campo: any,
  ): { valid: boolean; value?: any; error?: string } {
    const trimmed = response.trim();

    switch (campo.tipo) {
      case 'number': {
        // Extraer número del texto (soporta "3 días", "5", etc.)
        const numMatch = trimmed.match(/^(\d+)/);
        const num = numMatch ? parseFloat(numMatch[1]) : parseFloat(trimmed);
        if (isNaN(num)) {
          return {
            valid: false,
            error: '⚠️ Por favor ingresa un número válido.',
          };
        }
        if (campo.valorMinimo !== null && num < campo.valorMinimo) {
          return {
            valid: false,
            error: `⚠️ El valor mínimo es ${campo.valorMinimo}.`,
          };
        }
        if (campo.valorMaximo !== null && num > campo.valorMaximo) {
          return {
            valid: false,
            error: `⚠️ El valor máximo es ${campo.valorMaximo}.`,
          };
        }
        return { valid: true, value: num };
      }

      case 'checkbox': {
        const lower = trimmed.toLowerCase();
        if (['sí', 'si', 'yes', '1', 'true'].includes(lower)) {
          return { valid: true, value: true };
        }
        if (['no', '0', 'false'].includes(lower)) {
          return { valid: true, value: false };
        }
        return { valid: false, error: '⚠️ Responde "sí" o "no".' };
      }

      case 'select': {
        const opciones = campo.opciones as { value: string; label: string }[];

        // Intentar por número
        const num = parseInt(trimmed, 10);
        if (!isNaN(num) && num >= 1 && num <= opciones.length) {
          return { valid: true, value: opciones[num - 1].value };
        }

        // Intentar por valor exacto
        const opcion = opciones.find(
          (o) =>
            o.value.toLowerCase() === trimmed.toLowerCase() ||
            o.label.toLowerCase() === trimmed.toLowerCase(),
        );
        if (opcion) {
          return { valid: true, value: opcion.value };
        }

        return {
          valid: false,
          error: '⚠️ Opción no válida. Elige un número de la lista.',
        };
      }

      case 'text':
      default:
        if (!trimmed && campo.requerido) {
          return { valid: false, error: '⚠️ Este campo es requerido.' };
        }
        return { valid: true, value: trimmed };
    }
  }

  /**
   * Actualizar contexto de conversación
   */
  private async updateConversationContext(
    telefono: string,
    updates: Partial<{
      estado: string;
      moduloActivo: string | null;
      contexto: any;
    }>,
  ): Promise<void> {
    await this.prisma.conversacion.updateMany({
      where: { telefono },
      data: {
        ...updates,
        ultimoMensajeAt: new Date(),
      },
    });
  }

  /**
   * Resetear contexto
   */
  private async resetContext(telefono: string): Promise<void> {
    await this.prisma.conversacion.updateMany({
      where: { telefono },
      data: {
        estado: 'inicio',
        moduloActivo: null,
        contexto: {},
        ultimoMensajeAt: new Date(),
      },
    });
  }
}
