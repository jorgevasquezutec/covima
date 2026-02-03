import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PatronRecurrencia } from '@prisma/client';

// ==================== INTERFACES ====================

export interface ActividadCalendario {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  hora: string | null;
  horaFin: string | null;
  color: string;
  icono: string;
  esRecurrente: boolean;
  esCumpleanos?: boolean;
  usuarioCumpleanos?: {
    id: number;
    nombre: string;
    fotoUrl: string | null;
  };
  actividadPadreId: number | null;
  esInstanciaRecurrente?: boolean;
}

// ==================== ACTIVIDAD DTOs ====================

export class CreateActividadDto {
  @ApiProperty({ example: 'Grupo Pequeño - Enero', description: 'Título de la actividad' })
  @IsString()
  @MaxLength(200)
  titulo: string;

  @ApiPropertyOptional({ example: 'Reunión semanal del GP' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ example: '2026-02-05', description: 'Fecha de la actividad' })
  @IsDateString()
  fecha: string;

  @ApiPropertyOptional({ example: '18:00', description: 'Hora de inicio' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  hora?: string;

  @ApiPropertyOptional({ example: '20:00', description: 'Hora de fin' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  horaFin?: string;

  @ApiPropertyOptional({ example: '#3B82F6', description: 'Color en formato hex' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ example: 'Calendar', description: 'Nombre del ícono (Lucide)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icono?: string;

  @ApiPropertyOptional({ example: false, description: 'Si es actividad recurrente' })
  @IsOptional()
  @IsBoolean()
  esRecurrente?: boolean;

  @ApiPropertyOptional({
    enum: PatronRecurrencia,
    example: 'SEMANAL',
    description: 'Patrón de recurrencia',
  })
  @IsOptional()
  @IsEnum(PatronRecurrencia)
  patronRecurrencia?: PatronRecurrencia;

  @ApiPropertyOptional({ example: '2026-03-31', description: 'Fecha fin de recurrencia' })
  @IsOptional()
  @IsDateString()
  fechaFinRecurrencia?: string;

  @ApiPropertyOptional({ example: 3, description: 'Día de la semana (0=Dom, 6=Sáb)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana?: number;

  @ApiPropertyOptional({ example: 2, description: 'Semana del mes (1-5)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  semanaMes?: number;
}

export class UpdateActividadDto {
  @ApiPropertyOptional({ example: 'Grupo Pequeño - Febrero' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string;

  @ApiPropertyOptional({ example: 'Reunión semanal del GP' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ example: '2026-02-12' })
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  hora?: string;

  @ApiPropertyOptional({ example: '20:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  horaFin?: string;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ example: 'Calendar' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icono?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  esRecurrente?: boolean;

  @ApiPropertyOptional({ enum: PatronRecurrencia, example: 'SEMANAL' })
  @IsOptional()
  @IsEnum(PatronRecurrencia)
  patronRecurrencia?: PatronRecurrencia;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  fechaFinRecurrencia?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  semanaMes?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
