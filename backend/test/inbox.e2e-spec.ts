import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('InboxController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let testConversacionId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Create test admin token
    adminToken = jwtService.sign({
      sub: 1,
      nombre: 'Test Admin',
      roles: ['admin'],
    });

    // Clean up test data
    await prisma.mensaje.deleteMany({
      where: { conversacion: { telefono: { startsWith: '51TEST' } } },
    });
    await prisma.conversacion.deleteMany({
      where: { telefono: { startsWith: '51TEST' } },
    });

    // Create test conversation
    const conversacion = await prisma.conversacion.create({
      data: {
        telefono: '51TEST123456',
        modo: 'BOT',
        estado: 'activo',
      },
    });
    testConversacionId = conversacion.id;

    // Create test messages
    await prisma.mensaje.createMany({
      data: [
        {
          conversacionId: testConversacionId,
          contenido: 'Mensaje 1',
          tipo: 'text',
          direccion: 'ENTRANTE',
          estado: 'ENTREGADO',
        },
        {
          conversacionId: testConversacionId,
          contenido: 'Mensaje 2',
          tipo: 'text',
          direccion: 'SALIENTE',
          estado: 'ENVIADO',
        },
      ],
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.mensaje.deleteMany({
      where: { conversacion: { telefono: { startsWith: '51TEST' } } },
    });
    await prisma.conversacion.deleteMany({
      where: { telefono: { startsWith: '51TEST' } },
    });
    await app.close();
  });

  describe('GET /api/inbox/conversaciones', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/inbox/conversaciones')
        .expect(401);
    });

    it('should return paginated conversations', () => {
      return request(app.getHttpServer())
        .get('/api/inbox/conversaciones')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('hasMore');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter by modo', () => {
      return request(app.getHttpServer())
        .get('/api/inbox/conversaciones?modo=BOT')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          res.body.data.forEach((conv: any) => {
            expect(conv.modo).toBe('BOT');
          });
        });
    });

    it('should search by phone', () => {
      return request(app.getHttpServer())
        .get('/api/inbox/conversaciones?search=51TEST')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].telefono).toContain('51TEST');
        });
    });
  });

  describe('GET /api/inbox/conversaciones/:id', () => {
    it('should return a single conversation', () => {
      return request(app.getHttpServer())
        .get(`/api/inbox/conversaciones/${testConversacionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testConversacionId);
          expect(res.body.telefono).toBe('51TEST123456');
        });
    });

    it('should return 404 for non-existent conversation', () => {
      return request(app.getHttpServer())
        .get('/api/inbox/conversaciones/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /api/inbox/conversaciones/:id/mensajes', () => {
    it('should return paginated messages', () => {
      return request(app.getHttpServer())
        .get(`/api/inbox/conversaciones/${testConversacionId}/mensajes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('hasMore');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBe(2);
        });
    });

    it('should return messages with correct structure', () => {
      return request(app.getHttpServer())
        .get(`/api/inbox/conversaciones/${testConversacionId}/mensajes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const mensaje = res.body.data[0];
          expect(mensaje).toHaveProperty('id');
          expect(mensaje).toHaveProperty('contenido');
          expect(mensaje).toHaveProperty('tipo');
          expect(mensaje).toHaveProperty('direccion');
          expect(mensaje).toHaveProperty('estado');
          expect(mensaje).toHaveProperty('createdAt');
        });
    });
  });

  describe('POST /api/inbox/conversaciones/:id/tomar', () => {
    it('should take a conversation', async () => {
      // First ensure conversation is in BOT mode
      await prisma.conversacion.update({
        where: { id: testConversacionId },
        data: { modo: 'BOT', derivadaAId: null },
      });

      return request(app.getHttpServer())
        .post(`/api/inbox/conversaciones/${testConversacionId}/tomar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.conversacion.modo).toBe('HANDOFF');
        });
    });
  });

  describe('POST /api/inbox/conversaciones/:id/mensajes', () => {
    it('should send a message when in HANDOFF mode', async () => {
      // Ensure conversation is in HANDOFF mode
      await prisma.conversacion.update({
        where: { id: testConversacionId },
        data: { modo: 'HANDOFF', derivadaAId: 1 },
      });

      return request(app.getHttpServer())
        .post(`/api/inbox/conversaciones/${testConversacionId}/mensajes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ contenido: 'Test message from admin' })
        .expect(201)
        .expect((res) => {
          expect(res.body.mensaje).toBeDefined();
          expect(res.body.mensaje.contenido).toBe('Test message from admin');
          expect(res.body.mensaje.direccion).toBe('SALIENTE');
        });
    });

    it('should reject message when not in HANDOFF mode', async () => {
      await prisma.conversacion.update({
        where: { id: testConversacionId },
        data: { modo: 'BOT', derivadaAId: null },
      });

      return request(app.getHttpServer())
        .post(`/api/inbox/conversaciones/${testConversacionId}/mensajes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ contenido: 'Test message' })
        .expect(403);
    });
  });

  describe('POST /api/inbox/conversaciones/:id/cerrar', () => {
    it('should close handoff', async () => {
      // Ensure conversation is in HANDOFF mode
      await prisma.conversacion.update({
        where: { id: testConversacionId },
        data: { modo: 'HANDOFF', derivadaAId: 1 },
      });

      return request(app.getHttpServer())
        .post(`/api/inbox/conversaciones/${testConversacionId}/cerrar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });

  describe('POST /api/inbox/conversaciones/:id/leer', () => {
    it('should mark messages as read', () => {
      return request(app.getHttpServer())
        .post(`/api/inbox/conversaciones/${testConversacionId}/leer`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });

  describe('GET /api/inbox/admins-disponibles', () => {
    it('should return list of available admins', () => {
      return request(app.getHttpServer())
        .get('/api/inbox/admins-disponibles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
