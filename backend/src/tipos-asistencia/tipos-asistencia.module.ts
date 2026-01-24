import { Module } from '@nestjs/common';
import { TiposAsistenciaController } from './tipos-asistencia.controller';
import { TiposAsistenciaService } from './tipos-asistencia.service';

@Module({
  controllers: [TiposAsistenciaController],
  providers: [TiposAsistenciaService],
  exports: [TiposAsistenciaService],
})
export class TiposAsistenciaModule {}
