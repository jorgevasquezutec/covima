import { Test, TestingModule } from '@nestjs/testing';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';

describe('InboxController', () => {
  let controller: InboxController;

  const mockInboxService = {
    getConversaciones: jest.fn(),
    getConversacion: jest.fn(),
    getMensajes: jest.fn(),
    enviarMensaje: jest.fn(),
    tomarConversacion: jest.fn(),
    cerrarHandoff: jest.fn(),
    transferirConversacion: jest.fn(),
    marcarComoLeido: jest.fn(),
    getAdminsDisponibles: jest.fn(),
  };

  const mockRequest = {
    user: { id: 1, nombre: 'Test Admin' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InboxController],
      providers: [{ provide: InboxService, useValue: mockInboxService }],
    }).compile();

    controller = module.get<InboxController>(InboxController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getConversaciones', () => {
    it('should return paginated conversations', async () => {
      const mockResult = {
        data: [{ id: 1, telefono: '51999888777' }],
        nextCursor: null,
        hasMore: false,
      };

      mockInboxService.getConversaciones.mockResolvedValue(mockResult);

      const result = await controller.getConversaciones({}, mockRequest);

      expect(result).toEqual(mockResult);
      expect(mockInboxService.getConversaciones).toHaveBeenCalledWith({}, 1);
    });

    it('should pass filters correctly', async () => {
      mockInboxService.getConversaciones.mockResolvedValue({
        data: [],
        nextCursor: null,
        hasMore: false,
      });

      const dto = {
        modo: 'HANDOFF',
        search: 'test',
        misConversaciones: 'true',
      } as any;

      await controller.getConversaciones(dto, mockRequest);

      expect(mockInboxService.getConversaciones).toHaveBeenCalledWith(dto, 1);
    });
  });

  describe('getConversacion', () => {
    it('should return a single conversation', async () => {
      const mockConversacion = { id: 1, telefono: '51999888777', modo: 'BOT' };
      mockInboxService.getConversacion.mockResolvedValue(mockConversacion);

      const result = await controller.getConversacion(1);

      expect(result).toEqual(mockConversacion);
      expect(mockInboxService.getConversacion).toHaveBeenCalledWith(1);
    });
  });

  describe('getMensajes', () => {
    it('should return paginated messages', async () => {
      const mockResult = {
        data: [{ id: 1, contenido: 'Hola' }],
        nextCursor: null,
        hasMore: false,
        totalCount: 1,
      };

      mockInboxService.getMensajes.mockResolvedValue(mockResult);

      const result = await controller.getMensajes(1, {});

      expect(result).toEqual(mockResult);
      expect(mockInboxService.getMensajes).toHaveBeenCalledWith(1, {});
    });
  });

  describe('enviarMensaje', () => {
    it('should send a message', async () => {
      const mockResult = {
        mensaje: { id: 1, contenido: 'Test message' },
        enviado: true,
      };

      mockInboxService.enviarMensaje.mockResolvedValue(mockResult);

      const dto = { contenido: 'Test message' };
      const result = await controller.enviarMensaje(1, dto, mockRequest);

      expect(result).toEqual(mockResult);
      expect(mockInboxService.enviarMensaje).toHaveBeenCalledWith(1, dto, 1);
    });
  });

  describe('tomarConversacion', () => {
    it('should take a conversation', async () => {
      const mockResult = {
        success: true,
        conversacion: { id: 1, modo: 'HANDOFF', derivadaAId: 1 },
      };
      mockInboxService.tomarConversacion.mockResolvedValue(mockResult);

      const result = await controller.tomarConversacion(1, mockRequest);

      expect(result).toEqual(mockResult);
      expect(mockInboxService.tomarConversacion).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('cerrarHandoff', () => {
    it('should close handoff', async () => {
      const mockResult = { success: true };
      mockInboxService.cerrarHandoff.mockResolvedValue(mockResult);

      const dto = {};
      const result = await controller.cerrarHandoff(1, dto, mockRequest);

      expect(result).toEqual(mockResult);
      expect(mockInboxService.cerrarHandoff).toHaveBeenCalledWith(1, 1, dto);
    });

    it('should close handoff with farewell message', async () => {
      const mockResult = { success: true };
      mockInboxService.cerrarHandoff.mockResolvedValue(mockResult);

      const dto = { mensajeDespedida: 'Hasta luego' };
      await controller.cerrarHandoff(1, dto, mockRequest);

      expect(mockInboxService.cerrarHandoff).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('transferirConversacion', () => {
    it('should transfer conversation', async () => {
      const mockResult = { success: true };
      mockInboxService.transferirConversacion.mockResolvedValue(mockResult);

      const dto = { adminId: 2, mensajeContexto: 'Context info' };
      const result = await controller.transferirConversacion(
        1,
        dto,
        mockRequest,
      );

      expect(result).toEqual(mockResult);
      expect(mockInboxService.transferirConversacion).toHaveBeenCalledWith(
        1,
        1,
        dto,
      );
    });
  });

  describe('marcarComoLeido', () => {
    it('should mark messages as read', async () => {
      const mockResult = { success: true, count: 5 };
      mockInboxService.marcarComoLeido.mockResolvedValue(mockResult);

      const dto = {};
      const result = await controller.marcarComoLeido(1, dto, mockRequest);

      expect(result).toEqual(mockResult);
      expect(mockInboxService.marcarComoLeido).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('getAdminsDisponibles', () => {
    it('should return available admins', async () => {
      const mockAdmins = [
        { id: 1, nombre: 'Admin 1', rol: 'admin' },
        { id: 2, nombre: 'Admin 2', rol: 'lider' },
      ];

      mockInboxService.getAdminsDisponibles.mockResolvedValue(mockAdmins);

      const result = await controller.getAdminsDisponibles(mockRequest);

      expect(result).toEqual(mockAdmins);
      expect(mockInboxService.getAdminsDisponibles).toHaveBeenCalledWith(1);
    });
  });
});
