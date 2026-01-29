import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InboxService } from './inbox.service';
import { PrismaService } from '../prisma/prisma.service';
import { InboxGateway } from './inbox.gateway';
import { ModoFiltro, DireccionPaginacion } from './dto';

describe('InboxService', () => {
  let service: InboxService;

  const mockPrismaService = {
    conversacion: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    mensaje: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    usuario: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockInboxGateway = {
    emitMensajeNuevo: jest.fn(),
    emitConversacionActualizada: jest.fn(),
    emitConversacionNueva: jest.fn(),
    notifyAdmin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: InboxGateway, useValue: mockInboxGateway },
      ],
    }).compile();

    service = module.get<InboxService>(InboxService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getConversaciones', () => {
    const mockConversacion = {
      id: 1,
      telefono: '51999888777',
      modo: 'BOT',
      estado: 'activo',
      ultimoMensaje: 'Hola',
      mensajesNoLeidos: 0,
      updatedAt: new Date(),
      createdAt: new Date(),
      derivadaAt: null,
      usuario: { id: 1, nombre: 'Test User', nombreWhatsapp: 'Test', fotoUrl: null },
      derivadaA: null,
    };

    it('should return paginated conversations', async () => {
      mockPrismaService.conversacion.findMany.mockResolvedValue([mockConversacion]);

      const result = await service.getConversaciones({ limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.hasMore).toBe(false);
      expect(mockPrismaService.conversacion.findMany).toHaveBeenCalled();
    });

    it('should filter by modo HANDOFF', async () => {
      mockPrismaService.conversacion.findMany.mockResolvedValue([]);

      await service.getConversaciones({ modo: ModoFiltro.HANDOFF, limit: 20 });

      expect(mockPrismaService.conversacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ modo: 'HANDOFF' }),
        }),
      );
    });

    it('should filter by misConversaciones', async () => {
      mockPrismaService.conversacion.findMany.mockResolvedValue([]);

      await service.getConversaciones({ misConversaciones: 'true', limit: 20 }, 1);

      expect(mockPrismaService.conversacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ derivadaAId: 1 }),
        }),
      );
    });

    it('should search by phone or name', async () => {
      mockPrismaService.conversacion.findMany.mockResolvedValue([]);

      await service.getConversaciones({ search: '999', limit: 20 });

      expect(mockPrismaService.conversacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should handle cursor-based pagination', async () => {
      mockPrismaService.conversacion.findMany.mockResolvedValue([mockConversacion]);

      await service.getConversaciones({ cursor: '5', limit: 20 });

      expect(mockPrismaService.conversacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 5 },
          skip: 1,
        }),
      );
    });
  });

  describe('getConversacion', () => {
    it('should return a conversation by id', async () => {
      const mockConversacion = {
        id: 1,
        telefono: '51999888777',
        modo: 'BOT',
        estado: 'activo',
        ultimoMensaje: null,
        mensajesNoLeidos: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
        derivadaAt: null,
        usuario: { id: 1, nombre: 'Test', nombreWhatsapp: null, fotoUrl: null, telefono: '999888777', codigoPais: '51' },
        derivadaA: null,
      };

      mockPrismaService.conversacion.findUnique.mockResolvedValue(mockConversacion);

      const result = await service.getConversacion(1);

      expect(result.id).toBe(1);
      expect(mockPrismaService.conversacion.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.conversacion.findUnique.mockResolvedValue(null);

      await expect(service.getConversacion(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMensajes', () => {
    const mockMensaje = {
      id: 1,
      contenido: 'Hola',
      tipo: 'texto',
      direccion: 'ENTRANTE',
      estado: 'ENTREGADO',
      createdAt: new Date(),
      leidoAt: null,
      enviadoPor: null,
    };

    it('should return paginated messages', async () => {
      mockPrismaService.conversacion.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.mensaje.findMany.mockResolvedValue([mockMensaje]);
      mockPrismaService.mensaje.count.mockResolvedValue(1);

      const result = await service.getMensajes(1, { limit: 50 });

      expect(result.data).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });

    it('should throw NotFoundException if conversation not found', async () => {
      mockPrismaService.conversacion.findUnique.mockResolvedValue(null);

      await expect(service.getMensajes(999, { limit: 50 })).rejects.toThrow(NotFoundException);
    });

    it('should handle cursor pagination', async () => {
      mockPrismaService.conversacion.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.mensaje.findMany.mockResolvedValue([mockMensaje]);

      await service.getMensajes(1, { cursor: '10', limit: 50, direccion: DireccionPaginacion.ANTES });

      expect(mockPrismaService.mensaje.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 10 },
          skip: 1,
        }),
      );
    });
  });

  describe('tomarConversacion', () => {
    it('should take a conversation successfully', async () => {
      const mockConversacion = {
        id: 1,
        modo: 'BOT',
        derivadaAId: null,
        derivadaA: null,
      };

      const mockUpdated = {
        id: 1,
        telefono: '51999888777',
        modo: 'HANDOFF',
        estado: 'activo',
        ultimoMensaje: null,
        mensajesNoLeidos: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
        derivadaAId: 1,
        derivadaAt: new Date(),
        usuario: null,
        derivadaA: { id: 1, nombre: 'Admin' },
      };

      mockPrismaService.conversacion.findUnique.mockResolvedValue(mockConversacion);
      mockPrismaService.conversacion.update.mockResolvedValue(mockUpdated);

      const result = await service.tomarConversacion(1, 1);

      expect(result.success).toBe(true);
      expect(result.conversacion.modo).toBe('HANDOFF');
      expect(mockPrismaService.conversacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            modo: 'HANDOFF',
            derivadaAId: 1,
          }),
        }),
      );
    });

    it('should throw BadRequestException if already in HANDOFF by another admin', async () => {
      const mockConversacion = {
        id: 1,
        modo: 'HANDOFF',
        derivadaAId: 2,
        derivadaA: { id: 2, nombre: 'Other Admin' },
      };

      mockPrismaService.conversacion.findUnique.mockResolvedValue(mockConversacion);

      await expect(service.tomarConversacion(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if conversation not found', async () => {
      mockPrismaService.conversacion.findUnique.mockResolvedValue(null);

      await expect(service.tomarConversacion(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('cerrarHandoff', () => {
    it('should close handoff and return to BOT mode', async () => {
      const mockConversacion = {
        id: 1,
        modo: 'HANDOFF',
        derivadaAId: 1,
      };

      const mockUpdated = {
        id: 1,
        telefono: '51999888777',
        modo: 'BOT',
        estado: 'activo',
        ultimoMensaje: null,
        mensajesNoLeidos: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
        derivadaAId: null,
        derivadaAt: null,
        usuario: null,
        derivadaA: null,
      };

      mockPrismaService.conversacion.findUnique.mockResolvedValue(mockConversacion);
      mockPrismaService.conversacion.update.mockResolvedValue(mockUpdated);

      const result = await service.cerrarHandoff(1, 1, {});

      expect(result.success).toBe(true);
    });

    it('should throw ForbiddenException if not the assigned admin', async () => {
      const mockConversacion = {
        id: 1,
        modo: 'HANDOFF',
        derivadaAId: 2,
      };

      mockPrismaService.conversacion.findUnique.mockResolvedValue(mockConversacion);

      await expect(service.cerrarHandoff(1, 1, {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('transferirConversacion', () => {
    it('should transfer conversation to another admin', async () => {
      const mockConversacion = {
        id: 1,
        modo: 'HANDOFF',
        derivadaAId: 1,
      };

      const mockNuevoAdmin = {
        id: 2,
        nombre: 'New Admin',
        roles: [{ rol: { nombre: 'admin' } }],
      };

      const mockUpdated = {
        id: 1,
        telefono: '51999888777',
        modo: 'HANDOFF',
        estado: 'activo',
        ultimoMensaje: null,
        mensajesNoLeidos: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
        derivadaAId: 2,
        derivadaAt: new Date(),
        usuario: null,
        derivadaA: { id: 2, nombre: 'New Admin' },
      };

      mockPrismaService.conversacion.findUnique.mockResolvedValue(mockConversacion);
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockNuevoAdmin);
      mockPrismaService.conversacion.update.mockResolvedValue(mockUpdated);

      const result = await service.transferirConversacion(1, 1, { adminId: 2 });

      expect(result.success).toBe(true);
    });

    it('should throw ForbiddenException if not the current admin', async () => {
      const mockConversacion = {
        id: 1,
        modo: 'HANDOFF',
        derivadaAId: 2,
      };

      mockPrismaService.conversacion.findUnique.mockResolvedValue(mockConversacion);

      await expect(service.transferirConversacion(1, 1, { adminId: 3 })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('enviarMensaje', () => {
    it('should send a message from admin', async () => {
      const mockConversacion = {
        id: 1,
        modo: 'HANDOFF',
        derivadaAId: 1,
        telefono: '51999888777',
      };

      const mockMensaje = {
        id: 1,
        contenido: 'Hola desde admin',
        tipo: 'texto',
        direccion: 'SALIENTE',
        estado: 'ENVIADO',
        createdAt: new Date(),
        leidoAt: null,
        enviadoPor: { id: 1, nombre: 'Admin' },
      };

      mockPrismaService.conversacion.findUnique.mockResolvedValue(mockConversacion);
      mockPrismaService.mensaje.create.mockResolvedValue(mockMensaje);
      mockPrismaService.conversacion.update.mockResolvedValue(mockConversacion);

      const result = await service.enviarMensaje(1, { contenido: 'Hola desde admin' }, 1);

      expect(result.mensaje.contenido).toBe('Hola desde admin');
      expect(result.mensaje.direccion).toBe('SALIENTE');
    });

    it('should throw BadRequestException if not in HANDOFF mode', async () => {
      const mockConversacion = {
        id: 1,
        modo: 'BOT',
        derivadaAId: null,
      };

      mockPrismaService.conversacion.findUnique.mockResolvedValue(mockConversacion);

      await expect(service.enviarMensaje(1, { contenido: 'Test' }, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if assigned to another admin', async () => {
      const mockConversacion = {
        id: 1,
        modo: 'HANDOFF',
        derivadaAId: 2,
      };

      mockPrismaService.conversacion.findUnique.mockResolvedValue(mockConversacion);

      await expect(service.enviarMensaje(1, { contenido: 'Test' }, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getOrCreateConversacion', () => {
    it('should return existing conversation', async () => {
      const mockConversacion = {
        id: 1,
        telefono: '51999888777',
        modo: 'BOT',
        estado: 'activo',
        ultimoMensaje: null,
        mensajesNoLeidos: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
        derivadaAt: null,
        usuario: null,
        derivadaA: null,
      };

      // getOrCreateConversacion uses findUnique with { telefono }
      mockPrismaService.conversacion.findUnique.mockResolvedValue(mockConversacion);

      const result = await service.getOrCreateConversacion('51999888777');

      expect(result.conversacion.id).toBe(1);
      expect(result.isNew).toBe(false);
      expect(mockPrismaService.conversacion.create).not.toHaveBeenCalled();
    });

    it('should create new conversation if not exists', async () => {
      const mockNewConversacion = {
        id: 1,
        telefono: '51999888777',
        modo: 'BOT',
        estado: 'inicio',
        ultimoMensaje: null,
        mensajesNoLeidos: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
        derivadaAt: null,
        usuario: null,
        derivadaA: null,
      };

      // First call for findUnique (check existing) returns null
      // Second call for findUnique might be from other tests
      mockPrismaService.conversacion.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.usuario.findFirst.mockResolvedValue(null);
      mockPrismaService.conversacion.create.mockResolvedValue(mockNewConversacion);

      const result = await service.getOrCreateConversacion('51999888777', 'Test User');

      expect(result.conversacion.id).toBe(1);
      expect(result.isNew).toBe(true);
      expect(mockPrismaService.conversacion.create).toHaveBeenCalled();
      expect(mockInboxGateway.emitConversacionNueva).toHaveBeenCalled();
    });
  });

  describe('getAdminsDisponibles', () => {
    it('should return list of available admins', async () => {
      const mockAdmins = [
        { id: 1, nombre: 'Admin 1', fotoUrl: null, roles: [{ rol: { nombre: 'admin' } }] },
        { id: 2, nombre: 'Admin 2', fotoUrl: null, roles: [{ rol: { nombre: 'lider' } }] },
      ];

      mockPrismaService.usuario.findMany.mockResolvedValue(mockAdmins);

      const result = await service.getAdminsDisponibles();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('nombre');
    });
  });

  describe('marcarComoLeido', () => {
    it('should mark messages as read', async () => {
      mockPrismaService.conversacion.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.mensaje.updateMany.mockResolvedValue({ count: 5 });
      mockPrismaService.conversacion.update.mockResolvedValue({ id: 1, mensajesNoLeidos: 0 });

      const result = await service.marcarComoLeido(1, 1, {});

      expect(result.success).toBe(true);
      expect(mockPrismaService.mensaje.updateMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException if conversation not found', async () => {
      mockPrismaService.conversacion.findUnique.mockResolvedValue(null);

      await expect(service.marcarComoLeido(999, 1, {})).rejects.toThrow(NotFoundException);
    });
  });
});
