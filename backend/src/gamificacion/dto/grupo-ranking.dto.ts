import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';

export class CrearGrupoRankingDto {
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'El código solo puede contener letras minúsculas, números y guiones bajos',
  })
  codigo: string;

  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  icono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsBoolean()
  esPublico?: boolean;

  @IsOptional()
  @IsBoolean()
  soloMiembros?: boolean;

  @IsOptional()
  @IsNumber()
  periodoId?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  miembrosIds?: number[];
}

export class ActualizarGrupoRankingDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  icono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsBoolean()
  esPublico?: boolean;

  @IsOptional()
  @IsBoolean()
  soloMiembros?: boolean;

  @IsOptional()
  @IsNumber()
  periodoId?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class AgregarMiembrosDto {
  @IsArray()
  @IsNumber({}, { each: true })
  usuariosIds: number[];
}

export class ToggleOcultoDto {
  @IsBoolean()
  oculto: boolean;
}

export class SetParticipaRankingDto {
  @IsBoolean()
  participa: boolean;
}
