import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Servir archivos estáticos (fotos de perfil, etc.)
  // Usar process.cwd() para obtener la raíz del proyecto
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Prefijo global para la API
  app.setGlobalPrefix('api');

  // Validación de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS - permitir múltiples orígenes en desarrollo
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
  ];

  // En desarrollo, permitir cualquier origen de la red local
  if (process.env.NODE_ENV !== 'production') {
    app.enableCors({
      origin: (origin, callback) => {
        // Permitir requests sin origin (como Postman o curl)
        if (!origin) return callback(null, true);
        // Permitir orígenes locales (192.168.x.x, 10.x.x.x, localhost)
        if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/)) {
          return callback(null, true);
        }
        // Permitir orígenes en la lista
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    });
  } else {
    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
    });
  }

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Covima API')
    .setDescription('API del Sistema Programa + Asistencia')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');  // Escuchar en todas las interfaces
  console.log(`🚀 Server running on http://0.0.0.0:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
