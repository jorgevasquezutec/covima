import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CerrarHandoffDto {
  @ApiPropertyOptional({ description: 'Mensaje de despedida para el usuario' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mensajeDespedida?: string;
}
