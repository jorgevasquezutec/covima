import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ModoFiltro {
  BOT = 'BOT',
  HANDOFF = 'HANDOFF',
  PAUSADO = 'PAUSADO',
  TODOS = 'TODOS',
}

export class GetConversacionesDto {
  @ApiPropertyOptional({
    description: 'Cursor para paginación (ID de la última conversación)',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Límite de resultados',
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filtrar por modo de conversación',
    enum: ModoFiltro,
  })
  @IsOptional()
  @IsEnum(ModoFiltro)
  modo?: ModoFiltro;

  @ApiPropertyOptional({
    description: 'Filtrar solo mis conversaciones asignadas',
  })
  @IsOptional()
  @IsString()
  misConversaciones?: string;

  @ApiPropertyOptional({ description: 'Buscar por nombre o teléfono' })
  @IsOptional()
  @IsString()
  search?: string;
}
