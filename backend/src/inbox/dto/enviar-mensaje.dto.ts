import { IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TipoMensajeDto {
  TEXTO = 'TEXTO',
  IMAGEN = 'IMAGEN',
  DOCUMENTO = 'DOCUMENTO',
}

export class EnviarMensajeDto {
  @ApiProperty({ description: 'Contenido del mensaje' })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  contenido: string;

  @ApiPropertyOptional({ description: 'Tipo de mensaje', enum: TipoMensajeDto, default: TipoMensajeDto.TEXTO })
  @IsOptional()
  @IsEnum(TipoMensajeDto)
  tipo?: TipoMensajeDto = TipoMensajeDto.TEXTO;
}
