import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MarcarLeidoDto {
  @ApiPropertyOptional({ description: 'Marcar todos los mensajes hasta este ID como leídos' })
  @IsOptional()
  @IsString()
  hastaMessageId?: string;
}
