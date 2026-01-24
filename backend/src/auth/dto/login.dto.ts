import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '51', description: 'Código de país sin el +' })
  @IsString()
  @IsNotEmpty()
  codigoPais: string;

  @ApiProperty({ example: '940393758', description: 'Número de teléfono local' })
  @IsString()
  @IsNotEmpty()
  telefono: string;

  @ApiProperty({ example: 'admin123', description: 'Contraseña' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  user: {
    id: number;
    codigoPais: string;
    telefono: string;
    nombre: string;
    roles: string[];
    debeCambiarPassword: boolean;
  };
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}
