import { Module, forwardRef } from '@nestjs/common';
import { ProgramasController } from './programas.controller';
import { ProgramasService } from './programas.service';
import { WhatsappBotModule } from '../whatsapp-bot/whatsapp-bot.module';
import { GamificacionModule } from '../gamificacion/gamificacion.module';

@Module({
  imports: [
    forwardRef(() => WhatsappBotModule),
    forwardRef(() => GamificacionModule),
  ],
  controllers: [ProgramasController],
  providers: [ProgramasService],
  exports: [ProgramasService],
})
export class ProgramasModule {}
