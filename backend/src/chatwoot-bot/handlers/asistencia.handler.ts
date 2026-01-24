import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatwootBotService } from '../chatwoot-bot.service';
import { AsistenciaService } from '../../asistencia/asistencia.service';
import { RedisService } from '../../redis/redis.service';
import { ConversationContext } from '../dto';
import { getTodayAsUTC, getInicioSemana } from '../../common/utils';

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
        private readonly chatwootService: ChatwootBotService,
        private readonly redisService: RedisService,
        @Inject(forwardRef(() => AsistenciaService))
        private readonly asistenciaService: AsistenciaService,
    ) { }

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
            await this.chatwootService.sendMessage(context.conversationId, {
                content: '⚠️ No detecté un código QR válido. El formato es: JA-XXXXXXXX',
            });
            return;
        }

        // Buscar QR en la base de datos
        const qr = await this.prisma.qRAsistencia.findUnique({
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

        if (!qr) {
            await this.chatwootService.sendMessage(context.conversationId, {
                content: '❌ Código QR no válido. Verifica el código e intenta de nuevo.',
            });
            return;
        }

        if (!qr.activo) {
            await this.chatwootService.sendMessage(context.conversationId, {
                content: '⏸️ Este código QR ya no está activo.',
            });
            return;
        }

        // Verificar horario
        const ahora = new Date();
        const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
        const horaInicio = qr.horaInicio.getHours() * 60 + qr.horaInicio.getMinutes();
        const horaFin = qr.horaFin.getHours() * 60 + qr.horaFin.getMinutes();

        if (horaActual < horaInicio || horaActual >= horaFin) {
            const formatTime = (d: Date) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            await this.chatwootService.sendMessage(context.conversationId, {
                content: `⏰ El registro de asistencia solo está disponible de ${formatTime(qr.horaInicio)} a ${formatTime(qr.horaFin)}.`,
            });
            return;
        }

        // Verificar si ya registró esta semana
        const hoy = getTodayAsUTC();
        const semanaInicio = getInicioSemana(hoy);

        const existente = await this.prisma.asistencia.findFirst({
            where: {
                telefonoRegistro: context.telefono,
                semanaInicio,
                tipoId: qr.tipoId,
            },
        });

        if (existente) {
            await this.chatwootService.sendMessage(context.conversationId, {
                content: `✅ Ya registraste tu asistencia esta semana para ${qr.tipoAsistencia?.label || 'este tipo'}. ¡Dios te bendiga!`,
            });
            return;
        }

        // Si el tipo no requiere formulario, registrar directamente
        if (qr.tipoAsistencia?.soloPresencia || !qr.tipoAsistencia?.campos?.length) {
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
        await this.chatwootService.sendMessages(context.conversationId, saludos);

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
            await this.chatwootService.sendMessage(context.conversationId, {
                content: '⚠️ Necesito el código QR para registrar la asistencia.\n\nEjemplo: _registrar asistencia de Juan en JA-A1B2C3D4_',
            });
            return;
        }

        if (!nombreUsuario && !telefonoUsuario) {
            await this.chatwootService.sendMessage(context.conversationId, {
                content: '⚠️ Necesito el nombre o teléfono del usuario a registrar.\n\nEjemplo: _registrar asistencia de Juan en JA-A1B2C3D4_',
            });
            return;
        }

        // Buscar QR en la base de datos
        const qr = await this.prisma.qRAsistencia.findUnique({
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

        if (!qr) {
            await this.chatwootService.sendMessage(context.conversationId, {
                content: '❌ Código QR no válido. Verifica el código e intenta de nuevo.',
            });
            return;
        }

        if (!qr.activo) {
            await this.chatwootService.sendMessage(context.conversationId, {
                content: '⏸️ Este código QR ya no está activo.',
            });
            return;
        }

        // Verificar horario
        const ahora = new Date();
        const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
        const horaInicio = qr.horaInicio.getHours() * 60 + qr.horaInicio.getMinutes();
        const horaFin = qr.horaFin.getHours() * 60 + qr.horaFin.getMinutes();

        if (horaActual < horaInicio || horaActual >= horaFin) {
            const formatTime = (d: Date) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            await this.chatwootService.sendMessage(context.conversationId, {
                content: `⏰ El registro de asistencia solo está disponible de ${formatTime(qr.horaInicio)} a ${formatTime(qr.horaFin)}.`,
            });
            return;
        }

        // Buscar usuario objetivo por nombre o teléfono
        type UsuarioBasico = { id: number; nombre: string; telefono: string; codigoPais: string };
        let usuarioObjetivo: UsuarioBasico | null = null;
        let telefonoRegistro = telefonoUsuario || '';
        let nombreRegistro = nombreUsuario || '';

        if (telefonoUsuario) {
            const telefonoLimpio = telefonoUsuario.replace(/\D/g, '');
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
                // Múltiples coincidencias - pedir más información
                let mensaje = `⚠️ Encontré ${usuarios.length} usuarios con ese nombre:\n\n`;
                usuarios.forEach((u, i) => {
                    mensaje += `${i + 1}. ${u.nombre} (${u.telefono})\n`;
                });
                mensaje += `\n_Por favor especifica el teléfono del usuario._`;
                await this.chatwootService.sendMessage(context.conversationId, { content: mensaje });
                return;
            }
            // Si no encuentra usuario, usará el nombre proporcionado
        }

        // Verificar si ya registró esta semana
        const hoy = getTodayAsUTC();
        const semanaInicio = getInicioSemana(hoy);

        const whereClause: any = {
            semanaInicio,
            tipoId: qr.tipoId,
        };

        if (usuarioObjetivo) {
            whereClause.usuarioId = usuarioObjetivo.id;
        } else if (telefonoRegistro) {
            whereClause.telefonoRegistro = telefonoRegistro;
        } else {
            whereClause.nombreRegistro = nombreRegistro;
        }

        const existente = await this.prisma.asistencia.findFirst({ where: whereClause });

        if (existente) {
            await this.chatwootService.sendMessage(context.conversationId, {
                content: `⚠️ ${nombreRegistro || 'Este usuario'} ya tiene asistencia registrada esta semana para ${qr.tipoAsistencia?.label || 'este tipo'}.`,
            });
            return;
        }

        // Si el tipo no requiere formulario o es solo presencia, registrar directamente
        if (qr.tipoAsistencia?.soloPresencia || !qr.tipoAsistencia?.campos?.length) {
            await this.registrarAsistenciaManual(context, qr, usuarioObjetivo, telefonoRegistro, nombreRegistro);
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
        await this.chatwootService.sendMessages(context.conversationId, saludos);

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
            const asistencia = await this.prisma.asistencia.create({
                data: {
                    usuarioId: usuarioObjetivo?.id,
                    telefonoRegistro: telefonoRegistro || null,
                    nombreRegistro: nombreRegistro || null,
                    tipoId: qr.tipoId,
                    fecha: hoy,
                    semanaInicio,
                    datosFormulario: datosFormulario || {},
                    metodoRegistro: 'manual',
                    estado: 'confirmado', // Auto-confirmado por admin/líder
                    qrId: qr.id,
                    confirmadoPor: context.usuarioId, // Quien registró
                    confirmadoAt: new Date(),
                },
                include: { tipo: true },
            });

            let mensaje = `✅ *¡Asistencia registrada!*\n\n`;
            mensaje += `📋 ${qr.tipoAsistencia?.label || 'Asistencia'}\n`;
            mensaje += `👤 ${nombreRegistro || telefonoRegistro}\n`;
            mensaje += `📅 ${hoy.toLocaleDateString('es-PE')}\n`;
            mensaje += `✍️ Registrado por: ${context.nombreWhatsapp}\n`;

            if (datosFormulario && Object.keys(datosFormulario).length > 0) {
                mensaje += `\n📝 *Datos registrados:*\n`;
                for (const [key, value] of Object.entries(datosFormulario)) {
                    const campo = qr.tipoAsistencia?.campos?.find((c: any) => c.nombre === key);
                    const label = campo?.label || key;
                    mensaje += `   • ${label}: ${value}\n`;
                }
            }

            await this.chatwootService.sendMessage(context.conversationId, { content: mensaje });
            await this.resetContext(context.telefono);

            // Emitir evento WebSocket
            const asistenciaFormatted = {
                id: asistencia.id,
                usuario: usuarioObjetivo ? {
                    id: usuarioObjetivo.id,
                    nombre: usuarioObjetivo.nombre,
                    codigoPais: usuarioObjetivo.codigoPais,
                    telefono: usuarioObjetivo.telefono,
                } : null,
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
            await this.redisService.publish('asistencia:nueva', { qrCode: qr.codigo, asistencia: asistenciaFormatted });

        } catch (error) {
            this.logger.error(`Error registrando asistencia manual: ${error.message}`);

            if (error.code === 'P2002') {
                await this.chatwootService.sendMessage(context.conversationId, {
                    content: '⚠️ Este usuario ya tiene asistencia registrada esta semana.',
                });
            } else {
                await this.chatwootService.sendMessage(context.conversationId, {
                    content: '❌ Ocurrió un error al registrar la asistencia. Intenta de nuevo.',
                });
            }

            await this.resetContext(context.telefono);
        }
    }

    /**
     * Continuar flujo de formulario
     */
    async continueFlow(context: ConversationContext, message: string): Promise<void> {
        const flowData = context.datos as AsistenciaFlowData;

        if (!flowData || !flowData.campos) {
            await this.chatwootService.sendMessage(context.conversationId, {
                content: '❌ Ocurrió un error. Por favor, envía el código QR nuevamente.',
            });
            await this.resetContext(context.telefono);
            return;
        }

        const campoActual = flowData.campos[flowData.campoActual];

        // Validar respuesta
        const validacion = this.validateResponse(message, campoActual);

        if (!validacion.valid) {
            await this.chatwootService.sendMessage(context.conversationId, {
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
            await this.sendQuestion(context.conversationId, flowData.campos[flowData.campoActual]);
            return;
        }

        // Formulario completado - registrar asistencia
        const qr = await this.prisma.qRAsistencia.findUnique({
            where: { id: flowData.qrId },
            include: { tipoAsistencia: true },
        });

        if (!qr) {
            await this.chatwootService.sendMessage(context.conversationId, {
                content: '❌ Error: QR no encontrado.',
            });
            await this.resetContext(context.telefono);
            return;
        }

        // Si es registro manual (admin/líder registrando a otro usuario)
        if (flowData.esManual) {
            type UsuarioBasico = { id: number; nombre: string; telefono: string; codigoPais: string };
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

            const asistencia = await this.prisma.asistencia.create({
                data: {
                    usuarioId: usuario?.id,
                    telefonoRegistro: context.telefono,
                    nombreRegistro: context.nombreWhatsapp,
                    tipoId: qr.tipoId,
                    fecha: hoy,
                    semanaInicio,
                    datosFormulario: datosFormulario || {},
                    metodoRegistro: 'qr_bot',
                    estado: 'pendiente_confirmacion',
                    qrId: qr.id,
                },
                include: {
                    tipo: true,
                },
            });

            // Enviar confirmación
            let mensaje = `✅ *¡Asistencia registrada!*\n\n`;
            mensaje += `📋 ${qr.tipoAsistencia?.label || 'Asistencia'}\n`;
            mensaje += `👤 ${context.nombreWhatsapp}\n`;
            mensaje += `📅 ${hoy.toLocaleDateString('es-PE')}\n`;

            if (datosFormulario && Object.keys(datosFormulario).length > 0) {
                mensaje += `\n📝 *Datos registrados:*\n`;
                for (const [key, value] of Object.entries(datosFormulario)) {
                    const campo = qr.tipoAsistencia?.campos?.find((c: any) => c.nombre === key);
                    const label = campo?.label || key;
                    mensaje += `   • ${label}: ${value}\n`;
                }
            }

            mensaje += `\n¡Dios te bendiga! 🙏`;

            await this.chatwootService.sendMessage(context.conversationId, { content: mensaje });

            // Resetear contexto
            await this.resetContext(context.telefono);

            // Emitir evento WebSocket para actualizar sala de asistencia
            const asistenciaFormatted = {
                id: asistencia.id,
                usuario: usuario ? {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    codigoPais: usuario.codigoPais,
                    telefono: usuario.telefono,
                } : {
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
            await this.redisService.publish('asistencia:nueva', { qrCode: qr.codigo, asistencia: asistenciaFormatted });
            this.logger.log(`WebSocket event emitted for QR: ${qr.codigo}`);

        } catch (error) {
            this.logger.error(`Error registrando asistencia: ${error.message}`);

            if (error.code === 'P2002') {
                await this.chatwootService.sendMessage(context.conversationId, {
                    content: '⚠️ Ya registraste tu asistencia esta semana.',
                });
            } else {
                await this.chatwootService.sendMessage(context.conversationId, {
                    content: '❌ Ocurrió un error al registrar tu asistencia. Intenta de nuevo.',
                });
            }

            await this.resetContext(context.telefono);
        }
    }

    /**
     * Enviar pregunta del formulario
     */
    private async sendQuestion(conversationId: number, campo: any): Promise<void> {
        let pregunta = `📝 *${campo.label}*`;

        if (campo.placeholder) {
            pregunta += `\n_${campo.placeholder}_`;
        }

        if (campo.tipo === 'number' && (campo.valorMinimo !== null || campo.valorMaximo !== null)) {
            const min = campo.valorMinimo ?? 0;
            const max = campo.valorMaximo ?? '∞';
            pregunta += `\n_(Valor entre ${min} y ${max})_`;
        }

        if (campo.tipo === 'select' && campo.opciones) {
            const opciones = campo.opciones as { value: string; label: string }[];
            pregunta += `\n\nOpciones:\n`;
            opciones.forEach((opt, i) => {
                pregunta += `${i + 1}. ${opt.label}\n`;
            });
            pregunta += `\n_Responde con el número de tu opción_`;
        }

        if (campo.tipo === 'checkbox') {
            pregunta += `\n_(Responde "sí" o "no")_`;
        }

        await this.chatwootService.sendMessage(conversationId, { content: pregunta });
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
                const num = parseFloat(trimmed);
                if (isNaN(num)) {
                    return { valid: false, error: '⚠️ Por favor ingresa un número válido.' };
                }
                if (campo.valorMinimo !== null && num < campo.valorMinimo) {
                    return { valid: false, error: `⚠️ El valor mínimo es ${campo.valorMinimo}.` };
                }
                if (campo.valorMaximo !== null && num > campo.valorMaximo) {
                    return { valid: false, error: `⚠️ El valor máximo es ${campo.valorMaximo}.` };
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
                const opcion = opciones.find(o =>
                    o.value.toLowerCase() === trimmed.toLowerCase() ||
                    o.label.toLowerCase() === trimmed.toLowerCase()
                );
                if (opcion) {
                    return { valid: true, value: opcion.value };
                }

                return { valid: false, error: '⚠️ Opción no válida. Elige un número de la lista.' };
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
        updates: Partial<{ estado: string; moduloActivo: string | null; contexto: any }>,
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
