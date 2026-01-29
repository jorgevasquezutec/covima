import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DireccionPaginacion {
  ANTES = 'antes',
  DESPUES = 'despues',
}

export class GetMensajesDto {
  @ApiPropertyOptional({ description: 'Cursor para paginación (ID del mensaje)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Límite de resultados', default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Dirección de paginación: antes (scroll up) o despues (nuevos)',
    enum: DireccionPaginacion,
    default: DireccionPaginacion.ANTES
  })
  @IsOptional()
  @IsEnum(DireccionPaginacion)
  direccion?: DireccionPaginacion = DireccionPaginacion.ANTES;
}
