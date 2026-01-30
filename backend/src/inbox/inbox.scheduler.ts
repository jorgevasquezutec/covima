import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import {
  ModoConversacion,
  DireccionMensaje,
  EstadoMensaje,
} from '@prisma/client';
import { InboxGateway } from './inbox.gateway';
import { WhatsappBotService } from '../whatsapp-bot/whatsapp-bot.service';

@Injectable()
export class InboxScheduler {
  private readonly logger = new Logger(InboxScheduler.name);
  private readonly INACTIVITY_TIMEOUT_MINUTES = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly inboxGateway: InboxGateway,
    private readonly whatsappService: WhatsappBotService,
  ) {}

  /**
   * Liberar conversaciones en HANDOFF que han estado inactivas por más de 30 minutos
   * Se ejecuta cada 5 minutos
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async liberarConversacionesInactivas() {
    this.logger.debug('Verificando conversaciones inactivas...');

    const tiempoLimite = new Date();
    tiempoLimite.setMinutes(
      tiempoLimite.getMinutes() - this.INACTIVITY_TIMEOUT_MINUTES,
    );

    // Buscar conversaciones en HANDOFF sin actividad
    const conversacionesInactivas = await this.prisma.conversacion.findMany({
      where: {
        modo: ModoConversacion.HANDOFF,
        updatedAt: { lt: tiempoLimite },
      },
      include: {
        usuario: {
          select: { id: true, nombre: true, nombreWhatsapp: true },
        },
        derivadaA: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
            codigoPais: true,
            modoHandoffDefault: true,
          },
        },
      },
    });

    if (conversacionesInactivas.length === 0) {
      return;
    }

    this.logger.log(
      `Encontradas ${conversacionesInactivas.length} conversaciones inactivas`,
    );

    for (const conv of conversacionesInactivas) {
      try {
        // Notificar al admin si modo permite WhatsApp (WHATSAPP o AMBOS)
        const modoRespuesta =
          conv.modoRespuesta || conv.derivadaA?.modoHandoffDefault || 'AMBOS';
        if (conv.derivadaA && modoRespuesta !== 'WEB') {
          const telefonoAdmin = `${conv.derivadaA.codigoPais}${conv.derivadaA.telefono}`;
          await this.whatsappService.sendMessageToPhone(
            telefonoAdmin,
            conv.derivadaA.nombre,
            `⏰ La conversación con ${conv.usuario?.nombre || conv.telefono} ha sido cerrada por inactividad (${this.INACTIVITY_TIMEOUT_MINUTES} min).`,
          );
        }

        // Notificar al usuario
        const mensajeDespedida =
          '👋 La conversación ha sido devuelta al asistente automático por inactividad. Si necesitas ayuda, escribe tu consulta y te atenderemos.';

        // Guardar mensaje de sistema
        await this.prisma.mensaje.create({
          data: {
            conversacionId: conv.id,
            contenido: mensajeDespedida,
            direccion: DireccionMensaje.SALIENTE,
            tipo: 'sistema',
            estado: EstadoMensaje.ENVIADO,
          },
        });

        // Enviar a WhatsApp del usuario
        await this.whatsappService.sendMessageToPhone(
          conv.telefono,
          conv.usuario?.nombre || 'Usuario',
          mensajeDespedida,
        );

        // Cambiar modo a BOT
        const updated = await this.prisma.conversacion.update({
          where: { id: conv.id },
          data: {
            modo: ModoConversacion.BOT,
            derivadaAId: null,
            derivadaAt: null,
          },
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                nombreWhatsapp: true,
                fotoUrl: true,
              },
            },
            derivadaA: {
              select: { id: true, nombre: true },
            },
          },
        });

        // Emitir evento WebSocket
        await this.inboxGateway.emitConversacionActualizada({
          id: updated.id,
          telefono: updated.telefono,
          modo: updated.modo,
          estado: updated.estado,
          ultimoMensaje: updated.ultimoMensaje,
          mensajesNoLeidos: updated.mensajesNoLeidos,
          updatedAt: updated.updatedAt,
          usuario: updated.usuario,
          derivadaA: null,
        });

        this.logger.log(`Conversación ${conv.id} liberada por inactividad`);
      } catch (error) {
        this.logger.error(
          `Error liberando conversación ${conv.id}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Limpiar registros de throttling del gateway (cada hora)
   * Esto es opcional, para evitar memory leaks en producciones largas
   */
  @Cron(CronExpression.EVERY_HOUR)
  async limpiezaGeneral() {
    this.logger.debug('Ejecutando limpieza general...');
    // Aquí se pueden agregar otras tareas de limpieza si es necesario
  }
}
