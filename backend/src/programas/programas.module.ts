import { Module, forwardRef } from '@nestjs/common';
import { ProgramasController } from './programas.controller';
import { ProgramasService } from './programas.service';
import { WhatsappBotModule } from '../whatsapp-bot/whatsapp-bot.module';

@Module({
  imports: [forwardRef(() => WhatsappBotModule)],
  controllers: [ProgramasController],
  providers: [ProgramasService],
  exports: [ProgramasService],
})
export class ProgramasModule {}
