import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WhatsappBotController } from './whatsapp-bot.controller';
import { WhatsappBotService } from './whatsapp-bot.service';
import { OpenAIService } from './openai.service';
import { IntentRouterService } from './intent-router.service';
import { AsistenciaHandler } from './handlers/asistencia.handler';
import { UsuariosHandler } from './handlers/usuarios.handler';
import { ProgramasHandler } from './handlers/programas.handler';
import { NotificacionesHandler } from './handlers/notificaciones.handler';
import { PrismaModule } from '../prisma/prisma.module';
import { AsistenciaModule } from '../asistencia/asistencia.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { ProgramasModule } from '../programas/programas.module';
import { InboxModule } from '../inbox/inbox.module';
import { GamificacionModule } from '../gamificacion/gamificacion.module';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    AsistenciaModule,
    UsuariosModule,
    forwardRef(() => ProgramasModule),
    forwardRef(() => InboxModule),
    forwardRef(() => GamificacionModule),
  ],
  controllers: [WhatsappBotController],
  providers: [
    WhatsappBotService,
    OpenAIService,
    IntentRouterService,
    AsistenciaHandler,
    UsuariosHandler,
    ProgramasHandler,
    NotificacionesHandler,
  ],
  exports: [WhatsappBotService, OpenAIService],
})
export class WhatsappBotModule {}
