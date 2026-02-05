import { Module, forwardRef } from '@nestjs/common';
import { GamificacionController } from './gamificacion.controller';
import { GamificacionService } from './gamificacion.service';
import { GruposRankingController } from './grupos-ranking.controller';
import { GruposRankingService } from './grupos-ranking.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AsistenciaModule } from '../asistencia/asistencia.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AsistenciaModule)],
  controllers: [GamificacionController, GruposRankingController],
  providers: [GamificacionService, GruposRankingService],
  exports: [GamificacionService, GruposRankingService],
})
export class GamificacionModule {}
