import { Module, forwardRef } from '@nestjs/common';
import { ProgramasController } from './programas.controller';
import { ProgramasService } from './programas.service';
import { ChatwootBotModule } from '../chatwoot-bot/chatwoot-bot.module';

@Module({
  imports: [forwardRef(() => ChatwootBotModule)],
  controllers: [ProgramasController],
  providers: [ProgramasService],
  exports: [ProgramasService],
})
export class ProgramasModule {}
