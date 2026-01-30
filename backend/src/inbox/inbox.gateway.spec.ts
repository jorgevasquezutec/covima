import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { InboxGateway } from './inbox.gateway';
import { RedisService } from '../redis/redis.service';
import { Server, Socket } from 'socket.io';

describe('InboxGateway', () => {
  let gateway: InboxGateway;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue({
      subscribe: jest.fn(),
      on: jest.fn(),
    }),
    publish: jest.fn(),
  };

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as unknown as Server;

  const mockSocket = {
    id: 'socket-123',
    handshake: {
      auth: { token: 'valid-token' },
      headers: {},
    },
    data: {},
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
  } as unknown as Socket;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    gateway = module.get<InboxGateway>(InboxGateway);

    // Set the server
    gateway.server = mockServer;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should call jwt verify with token from handshake', async () => {
      const mockUser = { sub: 1, nombre: 'Test Admin' };
      mockJwtService.verify.mockReturnValue(mockUser);

      await gateway.handleConnection(mockSocket);

      // Verify that token was validated
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token');
    });

    it('should disconnect socket with invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const testSocket = {
        ...mockSocket,
        disconnect: jest.fn(),
      } as unknown as Socket;

      await gateway.handleConnection(testSocket);

      expect(testSocket.disconnect).toHaveBeenCalled();
    });

    it('should disconnect socket without token', async () => {
      const socketWithoutToken = {
        ...mockSocket,
        handshake: { auth: {}, headers: {} },
        disconnect: jest.fn(),
      } as unknown as Socket;

      await gateway.handleConnection(socketWithoutToken);

      expect(socketWithoutToken.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleJoin', () => {
    it('should join conversation room', () => {
      const mockEmit = jest.fn();
      const authenticatedSocket = {
        ...mockSocket,
        id: 'test-socket-id',
        data: { user: { sub: 1, nombre: 'Admin' } },
        join: jest.fn(),
        to: jest.fn().mockReturnValue({ emit: mockEmit }),
      } as unknown as Socket;

      gateway.handleJoin(authenticatedSocket, { conversacionId: 1 });

      expect(authenticatedSocket.join).toHaveBeenCalledWith('conv:1');
    });
  });

  describe('handleLeave', () => {
    it('should leave conversation room', () => {
      const mockEmit = jest.fn();
      const authenticatedSocket = {
        ...mockSocket,
        id: 'test-socket-id',
        data: { user: { sub: 1, nombre: 'Admin' } },
        leave: jest.fn(),
        to: jest.fn().mockReturnValue({ emit: mockEmit }),
      } as unknown as Socket;

      gateway.handleLeave(authenticatedSocket, { conversacionId: 1 });

      expect(authenticatedSocket.leave).toHaveBeenCalledWith('conv:1');
    });
  });

  describe('handleTyping', () => {
    it('should handle typing event without error', () => {
      const mockEmit = jest.fn();
      const authenticatedSocket = {
        ...mockSocket,
        id: 'test-socket-id',
        data: { user: { sub: 1, nombre: 'Admin' } },
        to: jest.fn().mockReturnValue({ emit: mockEmit }),
      } as unknown as Socket;

      gateway.handleTyping(authenticatedSocket, {
        conversacionId: 1,
        isTyping: true,
      });

      expect(authenticatedSocket.to).toHaveBeenCalledWith('conv:1');
      expect(mockEmit).toHaveBeenCalledWith('inbox:typing', expect.any(Object));
    });
  });

  describe('emitMensajeNuevo', () => {
    it('should emit new message to conversation room', async () => {
      const mensaje = {
        id: 1,
        contenido: 'Test',
        tipo: 'text',
        direccion: 'SALIENTE' as const,
        estado: 'ENVIADO' as const,
        createdAt: new Date(),
        enviadoPor: { id: 1, nombre: 'Admin' },
      };

      await gateway.emitMensajeNuevo(1, mensaje);

      expect(mockServer.to).toHaveBeenCalledWith('conv:1');
      expect(mockServer.emit).toHaveBeenCalled();
    });
  });

  describe('emitConversacionActualizada', () => {
    it('should emit conversation update to all admins', async () => {
      const data = { id: 1, modo: 'HANDOFF' as const };

      await gateway.emitConversacionActualizada(data);

      expect(mockServer.emit).toHaveBeenCalled();
    });
  });

  describe('emitConversacionNueva', () => {
    it('should emit new conversation to all admins', async () => {
      const conversacion = {
        id: 1,
        telefono: '51999888777',
        modo: 'BOT' as const,
        estado: 'activo',
        ultimoMensaje: 'Hola',
        mensajesNoLeidos: 1,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        usuario: null,
        derivadaA: null,
      };

      await gateway.emitConversacionNueva(conversacion);

      expect(mockServer.emit).toHaveBeenCalled();
    });
  });
});
