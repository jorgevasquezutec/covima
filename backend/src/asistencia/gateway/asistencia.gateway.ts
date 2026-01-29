import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../redis/redis.service';

interface RoomUser {
  userId: number;
  nombre: string;
  joinedAt: Date;
}

interface JoinRoomPayload {
  qrCode: string;
}

interface LeaveRoomPayload {
  qrCode: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/asistencia',
})
export class AsistenciaGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AsistenciaGateway.name);

  @WebSocketServer()
  server: Server;

  // Map de rooms activos: qrCode -> Map<socketId, RoomUser>
  private rooms = new Map<string, Map<string, RoomUser>>();

  constructor(
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {
    // Suscribirse a eventos de Redis para escalabilidad horizontal
    this.setupRedisSubscriptions();
  }

  private async setupRedisSubscriptions() {
    await this.redisService.subscribe('asistencia:nueva', (data) => {
      this.server.to(`qr:${data.qrCode}`).emit('nuevaAsistencia', data.asistencia);
    });

    await this.redisService.subscribe('asistencia:actualizada', (data) => {
      this.server.to(`qr:${data.qrCode}`).emit('asistenciaActualizada', data.asistencia);
    });
  }

  async handleConnection(client: Socket) {
    try {
      // Validar token JWT
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: no token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.user = payload;
      this.logger.log(`Client ${client.id} connected: ${payload.nombre}`);
    } catch (error) {
      this.logger.warn(`Client ${client.id} disconnected: invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Remover usuario de todos los rooms
    this.rooms.forEach((users, roomCode) => {
      if (users.has(client.id)) {
        users.delete(client.id);
        this.server.to(`qr:${roomCode}`).emit('usuarioSalio', {
          userId: client.data.user?.id,
          totalEnRoom: users.size,
        });
        this.logger.log(`User left room ${roomCode}, ${users.size} remaining`);
      }
    });
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomPayload,
  ) {
    if (!data?.qrCode) {
      return { success: false, error: 'qrCode is required' };
    }

    const roomName = `qr:${data.qrCode}`;
    client.join(roomName);

    // Registrar usuario en el room
    if (!this.rooms.has(data.qrCode)) {
      this.rooms.set(data.qrCode, new Map());
    }

    const roomUsers = this.rooms.get(data.qrCode)!;
    roomUsers.set(client.id, {
      userId: client.data.user.id,
      nombre: client.data.user.nombre,
      joinedAt: new Date(),
    });

    // Notificar a todos en el room
    this.server.to(roomName).emit('usuarioEntro', {
      usuario: { id: client.data.user.id, nombre: client.data.user.nombre },
      totalEnRoom: roomUsers.size,
    });

    // Enviar lista de usuarios actuales al que se une
    const usuarios = Array.from(roomUsers.values()).map((u) => ({
      id: u.userId,
      nombre: u.nombre,
      joinedAt: u.joinedAt,
    }));

    client.emit('estadoRoom', {
      usuarios,
      totalEnRoom: roomUsers.size,
    });

    this.logger.log(`User ${client.data.user.nombre} joined room ${data.qrCode}`);

    return { success: true, room: roomName, totalEnRoom: roomUsers.size };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LeaveRoomPayload,
  ) {
    if (!data?.qrCode) {
      return { success: false, error: 'qrCode is required' };
    }

    const roomName = `qr:${data.qrCode}`;
    client.leave(roomName);

    const roomUsers = this.rooms.get(data.qrCode);
    if (roomUsers) {
      roomUsers.delete(client.id);
      this.server.to(roomName).emit('usuarioSalio', {
        odId: client.data.user?.id,
        totalEnRoom: roomUsers.size,
      });
    }

    this.logger.log(`User ${client.data.user?.nombre} left room ${data.qrCode}`);

    return { success: true };
  }

  // Método para emitir desde el servicio de asistencia
  async emitNuevaAsistencia(qrCode: string, asistencia: any) {
    // Emitir localmente
    this.server.to(`qr:${qrCode}`).emit('nuevaAsistencia', asistencia);

    // Publicar en Redis para otras instancias
    await this.redisService.publish('asistencia:nueva', { qrCode, asistencia });
  }

  // Método para emitir actualización (confirmación/rechazo)
  async emitAsistenciaActualizada(qrCode: string, asistencia: any) {
    this.server.to(`qr:${qrCode}`).emit('asistenciaActualizada', asistencia);
    await this.redisService.publish('asistencia:actualizada', { qrCode, asistencia });
  }

  // Obtener estadísticas de un room
  getRoomStats(qrCode: string) {
    const roomUsers = this.rooms.get(qrCode);
    if (!roomUsers) {
      return { totalEnRoom: 0, usuarios: [] };
    }

    return {
      totalEnRoom: roomUsers.size,
      usuarios: Array.from(roomUsers.values()).map((u) => ({
        id: u.userId,
        nombre: u.nombre,
        joinedAt: u.joinedAt,
      })),
    };
  }
}
