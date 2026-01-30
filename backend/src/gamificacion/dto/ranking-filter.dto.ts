import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum TipoRanking {
  GENERAL = 'general',
  ASISTENCIA = 'asistencia',
  PARTICIPACION = 'participacion',
}

export class RankingFilterDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  periodoId?: number; // Si no se especifica, usa el período activo

  @IsOptional()
  @IsEnum(TipoRanking)
  tipo?: TipoRanking = TipoRanking.GENERAL;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;
}
