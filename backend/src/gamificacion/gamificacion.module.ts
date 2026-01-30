import { Module } from '@nestjs/common';
import { GamificacionController } from './gamificacion.controller';
import { GamificacionService } from './gamificacion.service';
import { GruposRankingController } from './grupos-ranking.controller';
import { GruposRankingService } from './grupos-ranking.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GamificacionController, GruposRankingController],
  providers: [GamificacionService, GruposRankingService],
  exports: [GamificacionService, GruposRankingService],
})
export class GamificacionModule {}
