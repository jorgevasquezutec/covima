import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ModoConversacion,
  DireccionMensaje,
  EstadoMensaje,
} from '@prisma/client';
import {
  GetConversacionesDto,
  ModoFiltro,
  GetMensajesDto,
  DireccionPaginacion,
  EnviarMensajeDto,
  TransferirConversacionDto,
  CerrarHandoffDto,
  MarcarLeidoDto,
} from './dto';
import { InboxGateway } from './inbox.gateway';
import { WhatsappBotService } from '../whatsapp-bot/whatsapp-bot.service';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => InboxGateway))
    private readonly inboxGateway: InboxGateway,
    @Inject(forwardRef(() => WhatsappBotService))
    private readonly whatsappService: WhatsappBotService,
  ) {}

  /**
   * Obtener lista de conversaciones con paginación cursor-based
   */
  async getConversaciones(dto: GetConversacionesDto, adminId?: number) {
    const { cursor, limit = 20, modo, misConversaciones, search } = dto;

    // Construir filtros
    const where: any = {};

    // Filtro por modo
    if (modo && modo !== ModoFiltro.TODOS) {
      where.modo = modo as ModoConversacion;
    }

    // Filtro por mis conversaciones asignadas
    if (misConversaciones === 'true' && adminId) {
      where.derivadaAId = adminId;
    }

    // Búsqueda por nombre o teléfono
    if (search) {
      where.OR = [
        { telefono: { contains: search } },
        { usuario: { nombre: { contains: search, mode: 'insensitive' } } },
        {
          usuario: {
            nombreWhatsapp: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    // Configurar query
    const queryOptions: any = {
      where,
      take: limit + 1, // Tomamos uno extra para saber si hay más
      orderBy: { updatedAt: 'desc' },
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
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    };

    // Paginación cursor-based
    if (cursor) {
      queryOptions.cursor = { id: parseInt(cursor, 10) };
      queryOptions.skip = 1; // Saltar el elemento del cursor
    }

    const conversaciones =
      await this.prisma.conversacion.findMany(queryOptions);

    const hasMore = conversaciones.length > limit;
    const data = hasMore ? conversaciones.slice(0, limit) : conversaciones;
    const nextCursor = hasMore ? String(data[data.length - 1].id) : null;

    return {
      data: data.map(this.formatConversacion),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Obtener detalle de una conversación
   */
  async getConversacion(id: number) {
    const conversacion = await this.prisma.conversacion.findUnique({
      where: { id },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            nombreWhatsapp: true,
            fotoUrl: true,
            telefono: true,
            codigoPais: true,
          },
        },
        derivadaA: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    if (!conversacion) {
      throw new NotFoundException('Conversación no encontrada');
    }

    return this.formatConversacion(conversacion);
  }

  /**
   * Obtener mensajes de una conversación con paginación cursor-based
   */
  async getMensajes(conversacionId: number, dto: GetMensajesDto) {
    const { cursor, limit = 50, direccion = DireccionPaginacion.ANTES } = dto;

    // Verificar que la conversación existe
    const conversacion = await this.prisma.conversacion.findUnique({
      where: { id: conversacionId },
    });

    if (!conversacion) {
      throw new NotFoundException('Conversación no encontrada');
    }

    // Construir query para paginación
    const orderBy =
      direccion === DireccionPaginacion.ANTES
        ? { createdAt: 'desc' as const }
        : { createdAt: 'asc' as const };

    const queryOptions: any = {
      where: { conversacionId },
      take: limit + 1,
      orderBy,
      include: {
        enviadoPor: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    };

    if (cursor) {
      queryOptions.cursor = { id: parseInt(cursor, 10) };
      queryOptions.skip = 1;
    }

    const mensajes = await this.prisma.mensaje.findMany(queryOptions);

    const hasMore = mensajes.length > limit;
    let data = hasMore ? mensajes.slice(0, limit) : mensajes;

    // Si estamos buscando mensajes después del cursor, revertimos el orden
    if (direccion === DireccionPaginacion.DESPUES) {
      data = data.reverse();
    }

    const nextCursor = hasMore ? String(data[data.length - 1].id) : null;

    // Obtener total count solo en primera carga (sin cursor)
    let totalCount: number | undefined;
    if (!cursor) {
      totalCount = await this.prisma.mensaje.count({
        where: { conversacionId },
      });
    }

    return {
      data: data.map(this.formatMensaje),
      nextCursor,
      hasMore,
      ...(totalCount !== undefined && { totalCount }),
    };
  }

  /**
   * Guardar un mensaje (usado internamente)
   */
  async guardarMensaje(data: {
    conversacionId: number;
    contenido: string;
    direccion: DireccionMensaje;
    tipo?: string;
    enviadoPorId?: number;
    whatsappMsgId?: string;
  }) {
    const mensaje = await this.prisma.mensaje.create({
      data: {
        conversacionId: data.conversacionId,
        contenido: data.contenido,
        direccion: data.direccion,
        tipo: data.tipo || 'texto',
        enviadoPorId: data.enviadoPorId,
        whatsappMsgId: data.whatsappMsgId,
        estado: EstadoMensaje.ENVIADO,
      },
      include: {
        enviadoPor: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    // Actualizar metadata de la conversación
    await this.prisma.conversacion.update({
      where: { id: data.conversacionId },
      data: {
        ultimoMensaje: data.contenido.substring(0, 500),
        updatedAt: new Date(),
        // Incrementar no leídos si es mensaje entrante
        ...(data.direccion === DireccionMensaje.ENTRANTE && {
          mensajesNoLeidos: { increment: 1 },
        }),
      },
    });

    const formattedMensaje = this.formatMensaje(mensaje);

    // Emitir evento WebSocket
    await this.inboxGateway.emitMensajeNuevo(
      data.conversacionId,
      formattedMensaje,
    );

    return formattedMensaje;
  }

  /**
   * Enviar mensaje como admin (incluye envío a WhatsApp)
   */
  async enviarMensaje(
    conversacionId: number,
    dto: EnviarMensajeDto,
    adminId: number,
  ) {
    // Verificar que la conversación existe y está en modo HANDOFF
    const conversacion = await this.prisma.conversacion.findUnique({
      where: { id: conversacionId },
    });

    if (!conversacion) {
      throw new NotFoundException('Conversación no encontrada');
    }

    if (conversacion.modo !== ModoConversacion.HANDOFF) {
      throw new BadRequestException(
        'Solo puedes enviar mensajes en conversaciones en modo HANDOFF. Primero toma la conversación.',
      );
    }

    if (conversacion.derivadaAId !== adminId) {
      throw new ForbiddenException(
        'Esta conversación está asignada a otro administrador',
      );
    }

    // Guardar mensaje en BD
    const mensaje = await this.guardarMensaje({
      conversacionId,
      contenido: dto.contenido,
      direccion: DireccionMensaje.SALIENTE,
      tipo: dto.tipo?.toLowerCase() || 'texto',
      enviadoPorId: adminId,
    });

    // Enviar a WhatsApp
    let enviado = false;
    try {
      const result = await this.whatsappService.sendMessageToPhone(
        conversacion.telefono,
        'Admin',
        dto.contenido,
      );
      enviado = result.success;

      if (!result.success) {
        this.logger.error(`Error enviando mensaje a WhatsApp: ${result.error}`);
      } else {
        this.logger.log(`Mensaje enviado a WhatsApp: ${conversacion.telefono}`);
      }
    } catch (error) {
      this.logger.error(`Error enviando mensaje a WhatsApp: ${error.message}`);
    }

    return {
      mensaje,
      enviado,
    };
  }

  /**
   * Tomar una conversación (handoff)
   */
  async tomarConversacion(conversacionId: number, adminId: number) {
    const conversacion = await this.prisma.conversacion.findUnique({
      where: { id: conversacionId },
      include: {
        derivadaA: { select: { id: true, nombre: true } },
      },
    });

    if (!conversacion) {
      throw new NotFoundException('Conversación no encontrada');
    }

    // Verificar que no esté ya tomada por otro admin
    if (
      conversacion.modo === ModoConversacion.HANDOFF &&
      conversacion.derivadaAId &&
      conversacion.derivadaAId !== adminId
    ) {
      throw new BadRequestException(
        `Esta conversación ya está siendo atendida por ${conversacion.derivadaA?.nombre || 'otro administrador'}`,
      );
    }

    // Actualizar conversación a modo HANDOFF
    const updated = await this.prisma.conversacion.update({
      where: { id: conversacionId },
      data: {
        modo: ModoConversacion.HANDOFF,
        derivadaAId: adminId,
        derivadaAt: new Date(),
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
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    this.logger.log(
      `Conversación ${conversacionId} tomada por admin ${adminId}`,
    );

    const formattedConversacion = this.formatConversacion(updated);

    // Emitir evento WebSocket
    await this.inboxGateway.emitConversacionActualizada(formattedConversacion);

    return {
      success: true,
      conversacion: formattedConversacion,
    };
  }

  /**
   * Cerrar handoff y devolver al bot
   */
  async cerrarHandoff(
    conversacionId: number,
    adminId: number,
    dto: CerrarHandoffDto,
  ) {
    const conversacion = await this.prisma.conversacion.findUnique({
      where: { id: conversacionId },
    });

    if (!conversacion) {
      throw new NotFoundException('Conversación no encontrada');
    }

    if (conversacion.modo !== ModoConversacion.HANDOFF) {
      throw new BadRequestException('La conversación no está en modo HANDOFF');
    }

    if (conversacion.derivadaAId !== adminId) {
      throw new ForbiddenException(
        'Solo el admin asignado puede cerrar esta conversación',
      );
    }

    // Enviar mensaje de despedida si se proporciona
    if (dto.mensajeDespedida) {
      await this.guardarMensaje({
        conversacionId,
        contenido: dto.mensajeDespedida,
        direccion: DireccionMensaje.SALIENTE,
        enviadoPorId: adminId,
      });

      // Enviar a WhatsApp
      try {
        await this.whatsappService.sendMessageToPhone(
          conversacion.telefono,
          'Admin',
          dto.mensajeDespedida,
        );
      } catch (error) {
        this.logger.error(
          `Error enviando mensaje de despedida a WhatsApp: ${error.message}`,
        );
      }
    }

    // Devolver al modo BOT
    const updated = await this.prisma.conversacion.update({
      where: { id: conversacionId },
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

    this.logger.log(
      `Handoff cerrado para conversación ${conversacionId} por admin ${adminId}`,
    );

    // Emitir evento WebSocket
    await this.inboxGateway.emitConversacionActualizada(
      this.formatConversacion(updated),
    );

    return { success: true };
  }

  /**
   * Transferir conversación a otro admin
   */
  async transferirConversacion(
    conversacionId: number,
    adminActualId: number,
    dto: TransferirConversacionDto,
  ) {
    const conversacion = await this.prisma.conversacion.findUnique({
      where: { id: conversacionId },
    });

    if (!conversacion) {
      throw new NotFoundException('Conversación no encontrada');
    }

    if (conversacion.modo !== ModoConversacion.HANDOFF) {
      throw new BadRequestException('La conversación no está en modo HANDOFF');
    }

    if (conversacion.derivadaAId !== adminActualId) {
      throw new ForbiddenException(
        'Solo el admin asignado puede transferir esta conversación',
      );
    }

    // Verificar que el nuevo admin existe y tiene rol admin/lider
    const nuevoAdmin = await this.prisma.usuario.findUnique({
      where: { id: dto.adminId },
      include: {
        roles: { include: { rol: true } },
      },
    });

    if (!nuevoAdmin) {
      throw new NotFoundException('El admin destino no existe');
    }

    const tieneRolAdmin = nuevoAdmin.roles.some(
      (r) => r.rol.nombre === 'admin' || r.rol.nombre === 'lider',
    );

    if (!tieneRolAdmin) {
      throw new BadRequestException(
        'El usuario destino no tiene permisos de administrador',
      );
    }

    // Transferir
    const updated = await this.prisma.conversacion.update({
      where: { id: conversacionId },
      data: {
        derivadaAId: dto.adminId,
        derivadaAt: new Date(),
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

    // Guardar mensaje de contexto si se proporciona
    if (dto.mensajeContexto) {
      // Esto es un mensaje interno, no se envía a WhatsApp
      await this.prisma.mensaje.create({
        data: {
          conversacionId,
          contenido: `[Transferido por admin anterior] ${dto.mensajeContexto}`,
          direccion: DireccionMensaje.SALIENTE,
          tipo: 'sistema',
          enviadoPorId: adminActualId,
          estado: EstadoMensaje.ENVIADO,
        },
      });
    }

    this.logger.log(
      `Conversación ${conversacionId} transferida de admin ${adminActualId} a ${dto.adminId}`,
    );

    // Emitir evento WebSocket
    await this.inboxGateway.emitConversacionActualizada(
      this.formatConversacion(updated),
    );

    // Notificar al nuevo admin
    this.inboxGateway.notifyAdmin(dto.adminId, 'inbox:conversacion:asignada', {
      conversacion: this.formatConversacion(updated),
      mensaje: dto.mensajeContexto || 'Se te ha transferido una conversación',
    });

    return { success: true };
  }

  /**
   * Marcar mensajes como leídos
   */
  async marcarComoLeido(
    conversacionId: number,
    adminId: number,
    dto: MarcarLeidoDto,
  ) {
    const conversacion = await this.prisma.conversacion.findUnique({
      where: { id: conversacionId },
    });

    if (!conversacion) {
      throw new NotFoundException('Conversación no encontrada');
    }

    const ahora = new Date();

    // Construir condición para actualizar mensajes
    const where: any = {
      conversacionId,
      direccion: DireccionMensaje.ENTRANTE,
      leidoAt: null,
    };

    if (dto.hastaMessageId) {
      // Obtener el mensaje para saber hasta qué fecha marcar
      const mensajeHasta = await this.prisma.mensaje.findUnique({
        where: { id: parseInt(dto.hastaMessageId, 10) },
      });

      if (mensajeHasta) {
        where.createdAt = { lte: mensajeHasta.createdAt };
      }
    }

    // Marcar mensajes como leídos
    await this.prisma.mensaje.updateMany({
      where,
      data: {
        leidoAt: ahora,
        estado: EstadoMensaje.LEIDO,
      },
    });

    // Resetear contador de no leídos
    await this.prisma.conversacion.update({
      where: { id: conversacionId },
      data: { mensajesNoLeidos: 0 },
    });

    return { success: true };
  }

  /**
   * Obtener admins disponibles para transferencia
   */
  async getAdminsDisponibles(excludeId?: number) {
    const admins = await this.prisma.usuario.findMany({
      where: {
        activo: true,
        roles: {
          some: {
            rol: {
              nombre: { in: ['admin', 'lider'] },
            },
          },
        },
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: {
        id: true,
        nombre: true,
        fotoUrl: true,
      },
      orderBy: { nombre: 'asc' },
    });

    return admins;
  }

  /**
   * Obtener o crear conversación por teléfono (usado por el bot)
   */
  async getOrCreateConversacion(telefono: string, nombreWhatsapp?: string) {
    const telefonoLimpio = telefono.replace(/\D/g, '');

    // Buscar conversación existente
    let conversacion = await this.prisma.conversacion.findUnique({
      where: { telefono: telefonoLimpio },
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

    if (conversacion) {
      return {
        conversacion: this.formatConversacion(conversacion),
        isNew: false,
      };
    }

    // Buscar usuario por teléfono para vincular
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        telefono: { endsWith: telefonoLimpio.slice(-9) },
      },
    });

    // Crear nueva conversación
    conversacion = await this.prisma.conversacion.create({
      data: {
        telefono: telefonoLimpio,
        usuarioId: usuario?.id,
        estado: 'inicio',
        modo: ModoConversacion.BOT,
        contexto: {},
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

    const formattedConversacion = this.formatConversacion(conversacion);

    // Emitir evento de nueva conversación
    await this.inboxGateway.emitConversacionNueva(formattedConversacion);

    this.logger.log(
      `Nueva conversación creada: ${conversacion.id} para ${telefonoLimpio}`,
    );

    return { conversacion: formattedConversacion, isNew: true };
  }

  /**
   * Verificar si un teléfono pertenece a un admin/lider
   */
  async esAdmin(
    telefono: string,
  ): Promise<{ esAdmin: boolean; usuario?: any }> {
    const telefonoLimpio = telefono.replace(/\D/g, '');

    const usuario = await this.prisma.usuario.findFirst({
      where: {
        telefono: { endsWith: telefonoLimpio.slice(-9) },
        activo: true,
      },
      include: {
        roles: { include: { rol: true } },
      },
    });

    if (!usuario) {
      return { esAdmin: false };
    }

    const esAdmin = usuario.roles.some(
      (r) => r.rol.nombre === 'admin' || r.rol.nombre === 'lider',
    );

    return {
      esAdmin,
      usuario: esAdmin
        ? {
            id: usuario.id,
            nombre: usuario.nombre,
            telefono: usuario.telefono,
            roles: usuario.roles.map((r) => r.rol.nombre),
          }
        : undefined,
    };
  }

  /**
   * Obtener conversaciones en HANDOFF asignadas a un admin
   */
  async getConversacionesHandoffDeAdmin(adminId: number) {
    const conversaciones = await this.prisma.conversacion.findMany({
      where: {
        modo: ModoConversacion.HANDOFF,
        derivadaAId: adminId,
      },
      include: {
        usuario: {
          select: { id: true, nombre: true, nombreWhatsapp: true },
        },
        derivadaA: {
          select: { id: true, nombre: true, modoHandoffDefault: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversaciones.map(this.formatConversacion);
  }

  /**
   * Obtener conversación por teléfono
   */
  async getConversacionByTelefono(telefono: string) {
    const telefonoLimpio = telefono.replace(/\D/g, '');

    const conversacion = await this.prisma.conversacion.findUnique({
      where: { telefono: telefonoLimpio },
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

    return conversacion ? this.formatConversacion(conversacion) : null;
  }

  /**
   * Contar conversaciones pendientes (sin asignar o en modo BOT con mensajes)
   */
  async contarPendientes() {
    const [sinAsignar, enHandoff] = await Promise.all([
      this.prisma.conversacion.count({
        where: {
          modo: ModoConversacion.PAUSADO,
        },
      }),
      this.prisma.conversacion.count({
        where: {
          modo: ModoConversacion.HANDOFF,
        },
      }),
    ]);

    return { sinAsignar, enHandoff, total: sinAsignar + enHandoff };
  }

  /**
   * Actualizar modo de respuesta para una conversación
   */
  async actualizarModoRespuesta(
    conversacionId: number,
    adminId: number,
    modoRespuesta: 'WEB' | 'WHATSAPP' | 'AMBOS' | null,
  ) {
    const conversacion = await this.prisma.conversacion.findUnique({
      where: { id: conversacionId },
    });

    if (!conversacion) {
      throw new NotFoundException('Conversación no encontrada');
    }

    if (conversacion.derivadaAId !== adminId) {
      throw new ForbiddenException(
        'Solo el admin asignado puede cambiar el modo de respuesta',
      );
    }

    const updated = await this.prisma.conversacion.update({
      where: { id: conversacionId },
      data: { modoRespuesta },
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
          select: { id: true, nombre: true, modoHandoffDefault: true },
        },
      },
    });

    return this.formatConversacion(updated);
  }

  /**
   * Formatear conversación para respuesta
   */
  private formatConversacion(conv: any) {
    return {
      id: conv.id,
      telefono: conv.telefono,
      modo: conv.modo,
      estado: conv.estado,
      ultimoMensaje: conv.ultimoMensaje,
      mensajesNoLeidos: conv.mensajesNoLeidos,
      modoRespuesta: conv.modoRespuesta,
      updatedAt: conv.updatedAt,
      createdAt: conv.createdAt,
      derivadaAt: conv.derivadaAt,
      usuario: conv.usuario
        ? {
            id: conv.usuario.id,
            nombre: conv.usuario.nombre,
            nombreWhatsapp: conv.usuario.nombreWhatsapp,
            fotoUrl: conv.usuario.fotoUrl,
          }
        : null,
      derivadaA: conv.derivadaA
        ? {
            id: conv.derivadaA.id,
            nombre: conv.derivadaA.nombre,
            modoHandoffDefault: conv.derivadaA.modoHandoffDefault,
          }
        : null,
    };
  }

  /**
   * Formatear mensaje para respuesta
   */
  private formatMensaje(msg: any) {
    return {
      id: msg.id,
      contenido: msg.contenido,
      tipo: msg.tipo,
      direccion: msg.direccion,
      estado: msg.estado,
      createdAt: msg.createdAt,
      leidoAt: msg.leidoAt,
      enviadoPor: msg.enviadoPor
        ? {
            id: msg.enviadoPor.id,
            nombre: msg.enviadoPor.nombre,
          }
        : null,
    };
  }
}
