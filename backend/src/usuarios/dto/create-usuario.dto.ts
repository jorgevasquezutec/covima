import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength,
  IsEmail,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUsuarioDto {
  @ApiProperty({ example: '51', description: 'Código de país sin +' })
  @IsString()
  @MinLength(1)
  @MaxLength(5)
  codigoPais: string;

  @ApiProperty({ example: '940393758', description: 'Número de teléfono sin código de país' })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @Matches(/^[0-9]+$/, { message: 'El teléfono solo debe contener números' })
  telefono: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({ example: 'password123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: 'juan@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Juan WhatsApp' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombreWhatsapp?: string;

  @ApiPropertyOptional({ example: ['participante'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ example: '1990-01-15' })
  @IsOptional()
  @IsString()
  fechaNacimiento?: string;

  @ApiPropertyOptional({ example: 'Av. Principal 123' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;

  @ApiPropertyOptional({ example: 'Descripción personal' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  biografia?: string;
}
