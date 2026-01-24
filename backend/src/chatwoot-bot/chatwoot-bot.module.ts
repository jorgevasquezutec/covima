import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatwootBotController } from './chatwoot-bot.controller';
import { ChatwootBotService } from './chatwoot-bot.service';
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

@Module({
    imports: [
        HttpModule,
        PrismaModule,
        AsistenciaModule,
        UsuariosModule,
        forwardRef(() => ProgramasModule),
    ],
    controllers: [ChatwootBotController],
    providers: [
        ChatwootBotService,
        OpenAIService,
        IntentRouterService,
        AsistenciaHandler,
        UsuariosHandler,
        ProgramasHandler,
        NotificacionesHandler,
    ],
    exports: [ChatwootBotService],
})
export class ChatwootBotModule { }
