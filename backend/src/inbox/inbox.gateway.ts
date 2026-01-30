import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';

// ==================== INTERFACES ====================

interface ConnectedAdmin {
  userId: number;
  nombre: string;
  socketId: string;
  joinedAt: Date;
  activeConversations: Set<number>;
}

// Alias para compatibilidad
type AdminId = number;

interface JoinConversationPayload {
  conversacionId: number;
}

interface LeaveConversationPayload {
  conversacionId: number;
}

interface TypingPayload {
  conversacionId: number;
  isTyping: boolean;
}

interface MensajeNuevoData {
  conversacionId: number;
  mensaje: any;
}

interface ConversacionActualizadaData {
  conversacion: any;
}

interface ConversacionNuevaData {
  conversacion: any;
}

// ==================== GATEWAY ====================

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/inbox',
  pingInterval: 25000, // Heartbeat cada 25 segundos
  pingTimeout: 10000, // Timeout de 10 segundos
})
export class InboxGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(InboxGateway.name);

  @WebSocketServer()
  server: Server;

  // Map de admins conectados: userId -> ConnectedAdmin
  private connectedAdmins = new Map<number, ConnectedAdmin>();

  // Map de socketId -> userId para búsqueda rápida
  private socketToUser = new Map<string, number>();

  // Throttle de typing: `${userId}:${conversacionId}` -> lastTypingTime
  private typingThrottle = new Map<string, number>();
  private readonly TYPING_THROTTLE_MS = 500;

  // Rate limiting: socketId -> { count, windowStart }
  private rateLimits = new Map<
    string,
    { count: number; windowStart: number }
  >();
  private readonly RATE_LIMIT_WINDOW_MS = 1000;
  private readonly RATE_LIMIT_MAX_EVENTS = 10;

  constructor(
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  afterInit() {
    this.logger.log('InboxGateway initialized');
    this.setupRedisSubscriptions();
  }

  // ==================== REDIS SUBSCRIPTIONS ====================

  private async setupRedisSubscriptions() {
    // Suscribirse a eventos de Redis para escalabilidad horizontal
    await this.redisService.subscribe(
      'inbox:mensaje:nuevo',
      (data: MensajeNuevoData) => {
        this.server
          .to(`conv:${data.conversacionId}`)
          .emit('inbox:mensaje:nuevo', {
            ...data.mensaje,
            conversacionId: data.conversacionId,
          });
        // También emitir a todos para actualizar lista de conversaciones
        this.server.emit('inbox:conversacion:actualizada', {
          id: data.conversacionId,
          ultimoMensaje: data.mensaje.contenido,
          updatedAt: data.mensaje.createdAt,
        });
      },
    );

    await this.redisService.subscribe(
      'inbox:conversacion:actualizada',
      (data: ConversacionActualizadaData) => {
        this.server.emit('inbox:conversacion:actualizada', data.conversacion);
      },
    );

    await this.redisService.subscribe(
      'inbox:conversacion:nueva',
      (data: ConversacionNuevaData) => {
        this.server.emit('inbox:conversacion:nueva', data.conversacion);
      },
    );

    await this.redisService.subscribe('inbox:typing', (data: any) => {
      this.server.to(`conv:${data.conversacionId}`).emit('inbox:typing', {
        userId: data.userId,
        nombre: data.nombre,
        isTyping: data.isTyping,
      });
    });
  }

  // ==================== CONNECTION HANDLERS ====================

  async handleConnection(client: Socket) {
    try {
      // Validar token JWT
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Client ${client.id} rejected: no token`);
        client.emit('error', { message: 'Token requerido' });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);

      // Verificar que tenga rol admin o lider
      const roles: string[] = payload.roles || [];
      if (!roles.includes('admin') && !roles.includes('lider')) {
        this.logger.warn(
          `Client ${client.id} rejected: insufficient permissions`,
        );
        client.emit('error', { message: 'Permisos insuficientes' });
        client.disconnect();
        return;
      }

      // Guardar datos del usuario en el socket
      client.data.user = payload;

      // Registrar admin conectado
      const adminData: ConnectedAdmin = {
        userId: payload.sub,
        nombre: payload.nombre,
        socketId: client.id,
        joinedAt: new Date(),
        activeConversations: new Set(),
      };

      // Si ya hay una conexión anterior, desconectarla
      const existingAdmin = this.connectedAdmins.get(payload.sub);
      if (existingAdmin && existingAdmin.socketId !== client.id) {
        const existingSocket = this.server.sockets.sockets.get(
          existingAdmin.socketId,
        );
        if (existingSocket) {
          existingSocket.emit('error', {
            message: 'Sesión iniciada en otro dispositivo',
          });
          existingSocket.disconnect();
        }
      }

      this.connectedAdmins.set(payload.sub, adminData);
      this.socketToUser.set(client.id, payload.sub);

      this.logger.log(
        `Admin ${payload.nombre} (${payload.sub}) connected via ${client.id}`,
      );

      // Enviar confirmación de conexión
      client.emit('connected', {
        userId: payload.sub,
        nombre: payload.nombre,
        connectedAt: adminData.joinedAt,
      });
    } catch (error) {
      this.logger.warn(
        `Client ${client.id} rejected: invalid token - ${error.message}`,
      );
      client.emit('error', { message: 'Token inválido' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);

    if (userId) {
      const admin = this.connectedAdmins.get(userId);
      if (admin && admin.socketId === client.id) {
        // Limpiar de todas las salas de conversación
        admin.activeConversations.forEach((convId) => {
          client.leave(`conv:${convId}`);
        });

        this.connectedAdmins.delete(userId);
        this.logger.log(`Admin ${admin.nombre} (${userId}) disconnected`);
      }

      this.socketToUser.delete(client.id);
    }

    // Limpiar rate limits
    this.rateLimits.delete(client.id);
  }

  // ==================== RATE LIMITING ====================

  private checkRateLimit(socketId: string): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(socketId);

    if (!limit || now - limit.windowStart > this.RATE_LIMIT_WINDOW_MS) {
      this.rateLimits.set(socketId, { count: 1, windowStart: now });
      return true;
    }

    if (limit.count >= this.RATE_LIMIT_MAX_EVENTS) {
      return false;
    }

    limit.count++;
    return true;
  }

  // ==================== ROOM HANDLERS ====================

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinConversationPayload,
  ) {
    if (!this.checkRateLimit(client.id)) {
      return { success: false, error: 'Rate limit exceeded' };
    }

    if (!data?.conversacionId) {
      return { success: false, error: 'conversacionId is required' };
    }

    const userId = client.data.user?.sub;
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    const roomName = `conv:${data.conversacionId}`;
    client.join(roomName);

    // Actualizar registro del admin
    const admin = this.connectedAdmins.get(userId);
    if (admin) {
      admin.activeConversations.add(data.conversacionId);
    }

    this.logger.debug(
      `Admin ${userId} joined conversation ${data.conversacionId}`,
    );

    // Notificar a otros en la sala
    client.to(roomName).emit('inbox:admin:joined', {
      userId,
      nombre: client.data.user.nombre,
      conversacionId: data.conversacionId,
    });

    return { success: true, room: roomName };
  }

  @SubscribeMessage('leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LeaveConversationPayload,
  ) {
    if (!data?.conversacionId) {
      return { success: false, error: 'conversacionId is required' };
    }

    const userId = client.data.user?.sub;
    const roomName = `conv:${data.conversacionId}`;

    client.leave(roomName);

    // Actualizar registro del admin
    const admin = this.connectedAdmins.get(userId);
    if (admin) {
      admin.activeConversations.delete(data.conversacionId);
    }

    this.logger.debug(
      `Admin ${userId} left conversation ${data.conversacionId}`,
    );

    // Notificar a otros en la sala
    this.server.to(roomName).emit('inbox:admin:left', {
      userId,
      conversacionId: data.conversacionId,
    });

    return { success: true };
  }

  // ==================== TYPING INDICATOR ====================

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingPayload,
  ) {
    if (!this.checkRateLimit(client.id)) {
      return { success: false, error: 'Rate limit exceeded' };
    }

    if (!data?.conversacionId) {
      return { success: false, error: 'conversacionId is required' };
    }

    const userId = client.data.user?.sub;
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Throttle de typing
    const throttleKey = `${userId}:${data.conversacionId}`;
    const lastTyping = this.typingThrottle.get(throttleKey) || 0;
    const now = Date.now();

    if (now - lastTyping < this.TYPING_THROTTLE_MS) {
      return { success: false, error: 'Typing throttled' };
    }

    this.typingThrottle.set(throttleKey, now);

    // Emitir a la sala (excepto al emisor)
    const roomName = `conv:${data.conversacionId}`;
    client.to(roomName).emit('inbox:typing', {
      userId,
      nombre: client.data.user.nombre,
      conversacionId: data.conversacionId,
      isTyping: data.isTyping,
    });

    // Publicar en Redis para otras instancias
    await this.redisService.publish('inbox:typing', {
      userId,
      nombre: client.data.user.nombre,
      conversacionId: data.conversacionId,
      isTyping: data.isTyping,
    });

    return { success: true };
  }

  // ==================== EMIT METHODS (para uso desde servicios) ====================

  /**
   * Emitir nuevo mensaje a una conversación
   */
  async emitMensajeNuevo(conversacionId: number, mensaje: any) {
    // Emitir localmente a la sala de la conversación (incluir conversacionId)
    this.server
      .to(`conv:${conversacionId}`)
      .emit('inbox:mensaje:nuevo', { ...mensaje, conversacionId });

    // Emitir actualización de conversación a todos los admins conectados
    this.server.emit('inbox:conversacion:actualizada', {
      id: conversacionId,
      ultimoMensaje: mensaje.contenido?.substring(0, 100),
      updatedAt: mensaje.createdAt,
      mensajesNoLeidos: mensaje.direccion === 'ENTRANTE' ? 1 : 0,
    });

    // Publicar en Redis para otras instancias
    await this.redisService.publish('inbox:mensaje:nuevo', {
      conversacionId,
      mensaje,
    });
  }

  /**
   * Emitir actualización de conversación (modo, asignación, etc.)
   */
  async emitConversacionActualizada(conversacion: any) {
    // Emitir a todos los admins conectados
    this.server.emit('inbox:conversacion:actualizada', conversacion);

    // Publicar en Redis
    await this.redisService.publish('inbox:conversacion:actualizada', {
      conversacion,
    });
  }

  /**
   * Emitir nueva conversación
   */
  async emitConversacionNueva(conversacion: any) {
    // Emitir a todos los admins conectados
    this.server.emit('inbox:conversacion:nueva', conversacion);

    // Publicar en Redis
    await this.redisService.publish('inbox:conversacion:nueva', {
      conversacion,
    });
  }

  /**
   * Notificar a un admin específico
   */
  notifyAdmin(adminId: number, event: string, data: any) {
    const admin = this.connectedAdmins.get(adminId);
    if (admin) {
      this.server.to(admin.socketId).emit(event, data);
    }
  }

  // ==================== UTILIDADES ====================

  /**
   * Obtener admins conectados
   */
  getConnectedAdmins(): {
    id: number;
    nombre: string;
    activeConversations: number[];
  }[] {
    return Array.from(this.connectedAdmins.values()).map((admin) => ({
      id: admin.userId,
      nombre: admin.nombre,
      activeConversations: Array.from(admin.activeConversations),
    }));
  }

  /**
   * Verificar si un admin está conectado
   */
  isAdminConnected(adminId: number): boolean {
    return this.connectedAdmins.has(adminId);
  }

  /**
   * Obtener admins viendo una conversación específica
   */
  getAdminsInConversation(
    conversacionId: number,
  ): { id: number; nombre: string }[] {
    const admins: { id: number; nombre: string }[] = [];

    this.connectedAdmins.forEach((admin) => {
      if (admin.activeConversations.has(conversacionId)) {
        admins.push({ id: admin.userId, nombre: admin.nombre });
      }
    });

    return admins;
  }
}
