import {
  IsInt,
  IsDateString,
  IsOptional,
  IsString,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegistrarEventoDto {
  @IsInt()
  @Type(() => Number)
  eventoConfigId: number;

  @IsDateString()
  fecha: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  usuarioIds: number[];

  @IsOptional()
  @IsString()
  notas?: string;
}

export class ActualizarPuntajeDto {
  @IsInt()
  @Type(() => Number)
  puntos: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  xp?: number;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}

export class CrearEventoDto {
  @IsString()
  codigo: string;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsInt()
  @Type(() => Number)
  puntos: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  xp?: number;

  @IsOptional()
  @IsString()
  icono?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class ActualizarEventoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  puntos?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  xp?: number;

  @IsOptional()
  @IsString()
  icono?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  activo?: boolean;
}
