import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: '51', description: 'Código de país sin el +' })
  @IsString()
  @IsNotEmpty()
  codigoPais: string;

  @ApiProperty({ example: '940393758', description: 'Número de teléfono local' })
  @IsString()
  @IsNotEmpty()
  telefono: string;
}

export class VerifyResetCodeDto {
  @ApiProperty({ example: '51' })
  @IsString()
  @IsNotEmpty()
  codigoPais: string;

  @ApiProperty({ example: '940393758' })
  @IsString()
  @IsNotEmpty()
  telefono: string;

  @ApiProperty({ example: '123456', description: 'Código de 6 dígitos' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class ResetPasswordWithTokenDto {
  @ApiProperty({ description: 'Token JWT de reset obtenido al verificar el código' })
  @IsString()
  @IsNotEmpty()
  resetToken: string;

  @ApiProperty({ example: 'nueva123', description: 'Nueva contraseña (mínimo 6 caracteres)' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
