import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsDateString,
  IsArray,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ==================== TIPO ROL ====================

export class CreateTipoRolDto {
  @ApiProperty({ example: 'Limpieza de Iglesia' })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({ example: 'Encargados de la limpieza semanal' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ example: '🧹' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  icono?: string;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  personasPorTurno?: number;

  @ApiPropertyOptional({ example: 'Escoba, trapeador, desinfectante' })
  @IsOptional()
  @IsString()
  opcionesTexto?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  coordinadorId?: number;
}

export class UpdateTipoRolDto {
  @ApiPropertyOptional({ example: 'Limpieza de Iglesia' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({ example: 'Encargados de la limpieza semanal' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ example: '🧹' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  icono?: string;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  personasPorTurno?: number;

  @ApiPropertyOptional({ example: 'Escoba, trapeador, desinfectante' })
  @IsOptional()
  @IsString()
  opcionesTexto?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  coordinadorId?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

// ==================== MIEMBROS ====================

export class AgregarMiembroDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  usuarioId?: number;

  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombreLibre?: string;
}

export class AgregarMiembrosRolDto {
  @ApiProperty({ type: [AgregarMiembroDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgregarMiembroDto)
  miembros: AgregarMiembroDto[];
}

export class ReorderMiembrosDto {
  @ApiProperty({ example: [3, 1, 2] })
  @IsArray()
  @IsInt({ each: true })
  orden: number[]; // Array de miembro IDs en el nuevo orden
}

// ==================== TURNOS ====================

export class GenerarTurnosDto {
  @ApiPropertyOptional({ example: '2026-03-28', description: 'Si no se envía, se calcula desde el último turno existente + 1 semana' })
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @ApiProperty({ example: '2026-05-23' })
  @IsDateString()
  fechaHasta: string;
}

export class CreateTurnoDto {
  @ApiProperty({ example: '2026-04-04' })
  @IsDateString()
  semana: string;

  @ApiProperty({ example: [1, 3] })
  @IsArray()
  @IsInt({ each: true })
  miembroIds: number[];

  @ApiPropertyOptional({ example: 'Turno especial' })
  @IsOptional()
  @IsString()
  notas?: string;
}

export class UpdateTurnoDto {
  @ApiPropertyOptional({ example: [1, 3, 5] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  miembroIds?: number[];

  @ApiPropertyOptional({ example: 'Traer detergente extra' })
  @IsOptional()
  @IsString()
  notas?: string;
}
