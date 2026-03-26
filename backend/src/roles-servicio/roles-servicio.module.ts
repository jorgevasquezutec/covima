import { Module, forwardRef } from '@nestjs/common';
import { RolesServicioController } from './roles-servicio.controller';
import { RolesServicioService } from './roles-servicio.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GamificacionModule } from '../gamificacion/gamificacion.module';
import { WhatsappBotModule } from '../whatsapp-bot/whatsapp-bot.module';
import { CalendarioModule } from '../calendario/calendario.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => GamificacionModule),
    forwardRef(() => WhatsappBotModule),
    CalendarioModule,
  ],
  controllers: [RolesServicioController],
  providers: [RolesServicioService],
  exports: [RolesServicioService],
})
export class RolesServicioModule {}
