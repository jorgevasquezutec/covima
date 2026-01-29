import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';
import { InboxGateway } from './inbox.gateway';
import { InboxScheduler } from './inbox.scheduler';
import { WhatsappBotModule } from '../whatsapp-bot/whatsapp-bot.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
    forwardRef(() => WhatsappBotModule),
  ],
  controllers: [InboxController],
  providers: [InboxService, InboxGateway, InboxScheduler],
  exports: [InboxService, InboxGateway],
})
export class InboxModule {}
