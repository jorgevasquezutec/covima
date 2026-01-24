import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ProgramasModule } from './programas/programas.module';
import { AsistenciaModule } from './asistencia/asistencia.module';
import { TiposAsistenciaModule } from './tipos-asistencia/tipos-asistencia.module';
import { WhatsappBotModule } from './whatsapp-bot/whatsapp-bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsuariosModule,
    ProgramasModule,
    AsistenciaModule,
    TiposAsistenciaModule,
    WhatsappBotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

