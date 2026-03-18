import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsInt,
  IsUrl,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AsignacionDto {
  @ApiProperty({ example: 1, description: 'ID de la parte' })
  @IsInt()
  parteId: number;

  @ApiPropertyOptional({
    example: [1, 2],
    description: 'IDs de usuarios asignados',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  usuarioIds?: number[];

  @ApiPropertyOptional({
    example: ['Juan Pérez', 'María García'],
    description: 'Nombres libres (usuarios no registrados)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nombresLibres?: string[];
}

export class LinkDto {
  @ApiProperty({ example: 1, description: 'ID de la parte' })
  @IsInt()
  parteId: number;

  @ApiProperty({ example: 'Himno Adventista 366' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'https://www.youtube.com/watch?v=xxx' })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({ example: 1, description: 'ID del MediaItem asociado' })
  @IsOptional()
  @IsInt()
  mediaItemId?: number;
}

export class FotoDto {
  @ApiProperty({ example: 1, description: 'ID de la parte' })
  @IsInt()
  parteId: number;

  @ApiProperty({ example: '/uploads/programas/programa-1234.jpg' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ example: 'Foto del grupo' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID del MediaItem asociado' })
  @IsOptional()
  @IsInt()
  mediaItemId?: number;
}

export class ParteOrdenDto {
  @ApiProperty({ example: 1, description: 'ID de la parte' })
  @IsInt()
  parteId: number;

  @ApiProperty({ example: 1, description: 'Orden de la parte en el programa' })
  @IsInt()
  orden: number;
}

export class CreateProgramaDto {
  @ApiProperty({
    example: '2025-01-25',
    description: 'Fecha del programa (sábado)',
  })
  @IsDateString()
  fecha: string;

  @ApiPropertyOptional({ example: 'Programa Maranatha Adoración' })
  @IsOptional()
  @IsString()
  titulo?: string;

  @ApiPropertyOptional({
    example: '18:30',
    description: 'Hora de inicio (HH:MM)',
  })
  @IsOptional()
  @IsString()
  horaInicio?: string;

  @ApiPropertyOptional({ example: '20:00', description: 'Hora de fin (HH:MM)' })
  @IsOptional()
  @IsString()
  horaFin?: string;

  @ApiPropertyOptional({
    type: [ParteOrdenDto],
    description: 'Partes incluidas en el programa con su orden',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParteOrdenDto)
  partes?: ParteOrdenDto[];

  @ApiPropertyOptional({ type: [AsignacionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AsignacionDto)
  asignaciones?: AsignacionDto[];

  @ApiPropertyOptional({ type: [LinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkDto)
  links?: LinkDto[];

  @ApiPropertyOptional({ type: [FotoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FotoDto)
  fotos?: FotoDto[];

  @ApiPropertyOptional({
    example: 1,
    description:
      'ID de un QR de asistencia existente para vincular al programa',
  })
  @IsOptional()
  @IsInt()
  qrAsistenciaId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID del tipo de asistencia para crear un nuevo QR vinculado',
  })
  @IsOptional()
  @IsInt()
  tipoAsistenciaId?: number;
}

export class CreateProgramaBatchDto {
  @ApiProperty({
    type: [CreateProgramaDto],
    description: 'Lista de programas a crear',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProgramaDto)
  programas: CreateProgramaDto[];
}
