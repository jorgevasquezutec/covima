import { IsDateString, IsInt, IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQRAsistenciaDto {
    @ApiProperty({ example: '2025-01-20', description: 'Fecha inicio de la semana (sábado)' })
    @IsDateString()
    semanaInicio: string;

    @ApiProperty({ example: 1, description: 'ID del tipo de asistencia' })
    @IsInt()
    tipoId: number;

    @ApiPropertyOptional({ example: '09:00', description: 'Hora de inicio de validez' })
    @IsOptional()
    @IsString()
    horaInicio?: string;

    @ApiPropertyOptional({ example: '12:00', description: 'Hora de fin de validez' })
    @IsOptional()
    @IsString()
    horaFin?: string;

    @ApiPropertyOptional({ example: 'QR para sábado 25 de enero' })
    @IsOptional()
    @IsString()
    descripcion?: string;
}

export class RegistrarAsistenciaDto {
    @ApiPropertyOptional({ description: 'Código del QR usado' })
    @IsOptional()
    @IsString()
    codigoQR?: string;

    @ApiPropertyOptional({ example: 1, description: 'ID del tipo de asistencia (si no se usa QR)' })
    @IsOptional()
    @IsInt()
    tipoId?: number;

    @ApiPropertyOptional({ example: { dias_estudio: 5, estudio_biblico: true }, description: 'Datos del formulario dinámico' })
    @IsOptional()
    @IsObject()
    datosFormulario?: Record<string, any>;

    @ApiPropertyOptional({ example: 'qr_web', description: 'Método: qr_web, qr_bot, plataforma' })
    @IsOptional()
    @IsString()
    metodoRegistro?: string;
}

export class RegistrarAsistenciaManualDto {
    @ApiProperty({ description: 'Código del QR (debe estar activo)' })
    @IsString()
    codigoQR: string;

    @ApiPropertyOptional({ description: 'ID del usuario a registrar (si tiene cuenta)' })
    @IsOptional()
    @IsInt()
    usuarioId?: number;

    @ApiPropertyOptional({ example: '51987654321', description: 'Teléfono si no tiene cuenta' })
    @IsOptional()
    @IsString()
    telefonoManual?: string;

    @ApiPropertyOptional({ example: 'Juan Pérez', description: 'Nombre si no tiene cuenta' })
    @IsOptional()
    @IsString()
    nombreManual?: string;

    @ApiPropertyOptional({ example: { dias_estudio: 5 }, description: 'Datos del formulario dinámico' })
    @IsOptional()
    @IsObject()
    datosFormulario?: Record<string, any>;
}

export class ConfirmarAsistenciaDto {
    @ApiProperty({ example: 'confirmado', description: 'Nuevo estado: confirmado o rechazado' })
    @IsString()
    estado: 'confirmado' | 'rechazado';

    @ApiPropertyOptional({ example: 'Llegó tarde pero asistió' })
    @IsOptional()
    @IsString()
    notas?: string;
}

export class UpdateQRAsistenciaDto {
    @ApiPropertyOptional({ example: '2025-01-27', description: 'Nueva fecha de la semana' })
    @IsOptional()
    @IsDateString()
    semanaInicio?: string;

    @ApiPropertyOptional({ example: '09:00', description: 'Hora de inicio de validez' })
    @IsOptional()
    @IsString()
    horaInicio?: string;

    @ApiPropertyOptional({ example: '12:00', description: 'Hora de fin de validez' })
    @IsOptional()
    @IsString()
    horaFin?: string;

    @ApiPropertyOptional({ example: 'QR para sábado 25 de enero' })
    @IsOptional()
    @IsString()
    descripcion?: string;
}

export class FilterAsistenciasDto {
    @ApiPropertyOptional({ description: 'Semana específica' })
    @IsOptional()
    @IsDateString()
    semanaInicio?: string;

    @ApiPropertyOptional({ description: 'Fecha inicio del rango' })
    @IsOptional()
    @IsDateString()
    fechaDesde?: string;

    @ApiPropertyOptional({ description: 'Fecha fin del rango' })
    @IsOptional()
    @IsDateString()
    fechaHasta?: string;

    @ApiPropertyOptional({ description: 'Estado: pendiente_confirmacion, confirmado, rechazado' })
    @IsOptional()
    @IsString()
    estado?: string;

    @ApiPropertyOptional({ description: 'ID del usuario' })
    @IsOptional()
    @IsInt()
    usuarioId?: number;

    @ApiPropertyOptional({ description: 'ID del tipo de asistencia' })
    @IsOptional()
    @IsInt()
    tipoId?: number;

    @ApiPropertyOptional({ description: 'Método de registro: qr_web, qr_bot, plataforma' })
    @IsOptional()
    @IsString()
    metodoRegistro?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @IsInt()
    page?: number;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @IsInt()
    limit?: number;
}
