import { PartialType } from '@nestjs/swagger';
import { CreateProgramaDto } from './create-programa.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProgramaDto extends PartialType(CreateProgramaDto) {
  @ApiPropertyOptional({ enum: ['borrador', 'completo', 'enviado', 'finalizado'] })
  @IsOptional()
  @IsString()
  estado?: string;
}
