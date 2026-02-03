import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { InboxModule } from './inbox/inbox.module';
import { GamificacionModule } from './gamificacion/gamificacion.module';
import { EstudiosBiblicosModule } from './estudios-biblicos/estudios-biblicos.module';
import { CalendarioModule } from './calendario/calendario.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsuariosModule,
    ProgramasModule,
    AsistenciaModule,
    TiposAsistenciaModule,
    WhatsappBotModule,
    InboxModule,
    GamificacionModule,
    EstudiosBiblicosModule,
    CalendarioModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
