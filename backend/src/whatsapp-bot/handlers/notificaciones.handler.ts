import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappBotService } from '../whatsapp-bot.service';
import { ProgramasService } from '../../programas/programas.service';
import { ConversationContext, IntentResult } from '../dto';
import { parseFecha, formatFecha } from '../utils/date.utils';

@Injectable()
export class NotificacionesHandler {
  private readonly logger = new Logger(NotificacionesHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappBotService,
    private readonly programasService: ProgramasService,
  ) {}

  /**
   * Manejar intención de enviar programa
   */
  async handle(
    context: ConversationContext,
    intent: IntentResult,
    message: string,
  ): Promise<void> {
    // Determinar fecha del programa o buscar el próximo
    let fecha = parseFecha(intent.entities.fecha || message);
    let programa;

    try {
      if (fecha) {
        // Buscar programa por fecha específica (toma el primero si hay varios)
        programa = await this.prisma.programa.findFirst({
          where: { fecha },
          orderBy: { createdAt: 'asc' },
          include: {
            asignaciones: {
              include: {
                parte: true,
                usuario: {
                  select: {
                    id: true,
                    nombre: true,
                    codigoPais: true,
                    telefono: true,
                  },
                },
              },
            },
          },
        });
      } else {
        // Buscar el próximo programa
        programa = await this.programasService.getProximoPrograma();
        if (programa) {
          fecha = programa.fecha;
        }
      }

      if (!programa || !fecha) {
        await this.whatsappService.sendMessage(context.conversationId, {
          content: '📭 No hay programas próximos. Crea uno primero.',
        });
        return;
      }

      // Verificar que hay asignaciones
      if (programa.asignaciones.length === 0) {
        await this.whatsappService.sendMessage(context.conversationId, {
          content: `⚠️ El programa del ${formatFecha(fecha)} no tiene participantes asignados.`,
        });
        return;
      }

      // Obtener participantes únicos (solo los que tienen usuario registrado)
      const participantes = new Map<
        number,
        { nombre: string; telefono: string; partes: string[] }
      >();
      const participantesLibres: { nombre: string; partes: string[] }[] = [];

      for (const asig of programa.asignaciones) {
        if (asig.usuario) {
          // Usuario registrado
          if (!participantes.has(asig.usuario.id)) {
            participantes.set(asig.usuario.id, {
              nombre: asig.usuario.nombre,
              telefono: `${asig.usuario.codigoPais}${asig.usuario.telefono}`,
              partes: [],
            });
          }
          participantes.get(asig.usuario.id)!.partes.push(asig.parte.nombre);
        } else if (asig.nombreLibre) {
          // Nombre libre (sin usuario registrado)
          const nombreLibre = asig.nombreLibre as string;
          const existing = participantesLibres.find(
            (p) => p.nombre === nombreLibre,
          );
          if (existing) {
            existing.partes.push(asig.parte.nombre);
          } else {
            participantesLibres.push({
              nombre: nombreLibre,
              partes: [asig.parte.nombre],
            });
          }
        }
      }

      // Generar texto del programa
      const textoGenerado = await this.programasService.generarTexto(
        programa.id,
      );

      // Mostrar resumen antes de enviar
      let resumen = `📋 *Programa del ${formatFecha(fecha)}*\n\n`;
      resumen += `👥 *Participantes a notificar (${participantes.size}):*\n`;

      for (const [, p] of participantes) {
        resumen += `• ${p.nombre}: ${p.partes.join(', ')}\n`;
      }

      // Guardar estado para confirmación
      await this.prisma.conversacion.updateMany({
        where: { telefono: context.telefono },
        data: {
          estado: 'confirmar_envio',
          moduloActivo: 'notificaciones',
          contexto: {
            programaId: programa.id,
            fecha: fecha.toISOString(),
            fechaFormateada: formatFecha(fecha),
            codigo: programa.codigo,
            participantes: Array.from(participantes.entries()),
            textoGenerado: textoGenerado.texto,
          },
        },
      });

      await this.whatsappService.sendInteractiveButtons(
        context.conversationId,
        resumen,
        [
          { id: 'notif_confirmar', title: 'Confirmar envío' },
          { id: 'notif_cancelar', title: 'Cancelar' },
        ],
      );
    } catch (error) {
      this.logger.error(`Error preparando envío: ${error.message}`);
      await this.whatsappService.sendMessage(context.conversationId, {
        content: '❌ Error al preparar el envío del programa.',
      });
    }
  }

  /**
   * Continuar flujo (confirmación de envío)
   */
  async continueFlow(
    context: ConversationContext,
    message: string,
  ): Promise<void> {
    const lower = message.toLowerCase().trim();

    if (
      !['sí', 'si', 'yes', 'confirmar', 'enviar', 'confirmar envío'].includes(
        lower,
      )
    ) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content: '❌ Envío cancelado.',
      });
      await this.resetContext(context.telefono);
      return;
    }

    const datos = context.datos as {
      programaId: number;
      fecha: string;
      fechaFormateada: string;
      codigo: string;
      participantes: [
        number,
        { nombre: string; telefono: string; partes: string[] },
      ][];
      textoGenerado: string;
    };

    if (!datos || !datos.participantes) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content: '❌ Error: datos de envío no encontrados.',
      });
      await this.resetContext(context.telefono);
      return;
    }

    await this.whatsappService.sendMessage(context.conversationId, {
      content: '📤 Enviando notificaciones...',
    });

    let enviados = 0;
    let errores = 0;

    for (const [usuarioId, participante] of datos.participantes) {
      try {
        // Enviar plantilla de WhatsApp con botón URL al programa público
        // El text del botón URL es solo el sufijo dinámico {{1}} (el código),
        // la URL base se configura en la plantilla de Meta Business Suite
        const result = await this.whatsappService.sendTemplateToPhone(
          participante.telefono,
          'recordatorio_programa_v2',
          'es_PE',
          [
            participante.nombre, // {{1}} nombre
            datos.fechaFormateada, // {{2}} fecha
            participante.partes.join(', '), // {{3}} partes asignadas
          ],
          undefined, // messageContentForInbox
          [{ index: 0, text: datos.codigo }], // sufijo URL: /programa/{codigo}
        );

        // Crear notificación en BD
        await this.prisma.notificacion.create({
          data: {
            usuarioId,
            telefono: participante.telefono,
            tipo: 'programa_asignacion',
            mensaje: datos.textoGenerado,
            programaId: datos.programaId,
            estado: result.success ? 'enviado' : 'error',
            enviadoAt: result.success ? new Date() : null,
            errorMensaje: result.error || null,
          },
        });

        if (result.success) {
          enviados++;
        } else {
          this.logger.warn(
            `Error enviando a ${participante.nombre}: ${result.error}`,
          );
          errores++;
        }
      } catch (error) {
        this.logger.error(
          `Error enviando a ${participante.nombre}: ${error.message}`,
        );
        errores++;
      }
    }

    // Marcar programa como enviado
    await this.prisma.programa.update({
      where: { id: datos.programaId },
      data: { enviadoAt: new Date() },
    });

    let resultado = `✅ *Envío completado*\n\n`;
    resultado += `📤 Enviados: ${enviados}\n`;
    if (errores > 0) {
      resultado += `❌ Errores: ${errores}\n`;
    }

    await this.whatsappService.sendMessage(context.conversationId, {
      content: resultado,
    });
    await this.resetContext(context.telefono);
  }

  // === Helpers ===

  private async resetContext(telefono: string): Promise<void> {
    await this.prisma.conversacion.updateMany({
      where: { telefono },
      data: {
        estado: 'inicio',
        moduloActivo: null,
        contexto: {},
      },
    });
  }

}
