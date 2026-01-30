import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferirConversacionDto {
  @ApiProperty({ description: 'ID del admin al que se transfiere' })
  @IsInt()
  adminId: number;

  @ApiPropertyOptional({
    description: 'Mensaje de contexto para el nuevo admin',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mensajeContexto?: string;
}
