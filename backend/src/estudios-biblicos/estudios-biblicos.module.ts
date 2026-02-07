import { Module } from '@nestjs/common';
import { EstudiosBiblicosController } from './estudios-biblicos.controller';
import { EstudiosBiblicosService } from './estudios-biblicos.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GamificacionModule } from '../gamificacion/gamificacion.module';

@Module({
  imports: [PrismaModule, GamificacionModule],
  controllers: [EstudiosBiblicosController],
  providers: [EstudiosBiblicosService],
  exports: [EstudiosBiblicosService],
})
export class EstudiosBiblicosModule {}
