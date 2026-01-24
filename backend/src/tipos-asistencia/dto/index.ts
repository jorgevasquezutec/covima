import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsArray,
  ValidateNested,
  Matches,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCampoDto {
  @ApiProperty({ description: 'Nombre único del campo (slug)', example: 'dias_estudio' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'El nombre debe ser un slug válido (minúsculas, números y guiones bajos)',
  })
  nombre: string;

  @ApiProperty({ description: 'Etiqueta visible del campo', example: 'Días de estudio de lección' })
  @IsString()
  label: string;

  @ApiProperty({
    description: 'Tipo de campo',
    enum: ['number', 'checkbox', 'text', 'select', 'rating'],
  })
  @IsString()
  @IsIn(['number', 'checkbox', 'text', 'select', 'rating'])
  tipo: string;

  @ApiPropertyOptional({ description: 'Si el campo es requerido' })
  @IsOptional()
  @IsBoolean()
  requerido?: boolean;

  @ApiPropertyOptional({ description: 'Orden del campo en el formulario' })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;

  @ApiPropertyOptional({ description: 'Texto placeholder' })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional({ description: 'Valor mínimo (para type=number)' })
  @IsOptional()
  @IsInt()
  valorMinimo?: number;

  @ApiPropertyOptional({ description: 'Valor máximo (para type=number)' })
  @IsOptional()
  @IsInt()
  valorMaximo?: number;

  @ApiPropertyOptional({
    description: 'Opciones para campos select',
    example: [{ value: 'opcion1', label: 'Opción 1' }],
  })
  @IsOptional()
  @IsArray()
  opciones?: { value: string; label: string }[];
}

export class UpdateCampoDto {
  @ApiPropertyOptional({ description: 'Etiqueta visible del campo' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    description: 'Tipo de campo',
    enum: ['number', 'checkbox', 'text', 'select', 'rating'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['number', 'checkbox', 'text', 'select', 'rating'])
  tipo?: string;

  @ApiPropertyOptional({ description: 'Si el campo es requerido' })
  @IsOptional()
  @IsBoolean()
  requerido?: boolean;

  @ApiPropertyOptional({ description: 'Orden del campo en el formulario' })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;

  @ApiPropertyOptional({ description: 'Texto placeholder' })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional({ description: 'Valor mínimo (para type=number)' })
  @IsOptional()
  @IsInt()
  valorMinimo?: number;

  @ApiPropertyOptional({ description: 'Valor máximo (para type=number)' })
  @IsOptional()
  @IsInt()
  valorMaximo?: number;

  @ApiPropertyOptional({
    description: 'Opciones para campos select',
    example: [{ value: 'opcion1', label: 'Opción 1' }],
  })
  @IsOptional()
  @IsArray()
  opciones?: { value: string; label: string }[];

  @ApiPropertyOptional({ description: 'Si el campo está activo' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class CreateTipoAsistenciaDto {
  @ApiProperty({ description: 'Nombre único del tipo (slug)', example: 'escuela_sabatica' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'El nombre debe ser un slug válido (minúsculas, números y guiones bajos)',
  })
  nombre: string;

  @ApiProperty({ description: 'Etiqueta visible', example: 'Escuela Sabática' })
  @IsString()
  label: string;

  @ApiPropertyOptional({ description: 'Descripción del tipo de asistencia' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Nombre del ícono (lucide)', example: 'BookOpen' })
  @IsOptional()
  @IsString()
  icono?: string;

  @ApiPropertyOptional({ description: 'Color en formato hex', example: '#3B82F6' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'El color debe ser un código hex válido (#RRGGBB)',
  })
  color?: string;

  @ApiPropertyOptional({ description: 'Si solo registra presencia (sin formulario adicional)' })
  @IsOptional()
  @IsBoolean()
  soloPresencia?: boolean;

  @ApiPropertyOptional({ description: 'Orden de visualización' })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;

  @ApiPropertyOptional({
    description: 'Campos del formulario',
    type: [CreateCampoDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCampoDto)
  campos?: CreateCampoDto[];
}

export class UpdateTipoAsistenciaDto {
  @ApiPropertyOptional({ description: 'Etiqueta visible' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Descripción del tipo de asistencia' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Nombre del ícono (lucide)' })
  @IsOptional()
  @IsString()
  icono?: string;

  @ApiPropertyOptional({ description: 'Color en formato hex' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'El color debe ser un código hex válido (#RRGGBB)',
  })
  color?: string;

  @ApiPropertyOptional({ description: 'Si solo registra presencia (sin formulario adicional)' })
  @IsOptional()
  @IsBoolean()
  soloPresencia?: boolean;

  @ApiPropertyOptional({ description: 'Orden de visualización' })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;

  @ApiPropertyOptional({ description: 'Si el tipo está activo' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
