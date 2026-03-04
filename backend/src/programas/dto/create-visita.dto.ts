import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateVisitaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  procedencia: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  direccion?: string;
}
