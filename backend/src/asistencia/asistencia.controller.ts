import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
    Request,
    Res,
    Header,
} from '@nestjs/common';
import type { Response } from 'express';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { AsistenciaService } from './asistencia.service';
import {
    CreateQRAsistenciaDto,
    UpdateQRAsistenciaDto,
    RegistrarAsistenciaDto,
    RegistrarAsistenciaManualDto,
    ConfirmarAsistenciaDto,
} from './dto';

@ApiTags('Asistencia')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('asistencia')
export class AsistenciaController {
    constructor(private readonly asistenciaService: AsistenciaService) { }

    private getUserId(req: any): number {
        return req.user.id;
    }

    // ==================== QR ENDPOINTS ====================

    @Post('qr')
    @Roles('admin', 'lider')
    @ApiOperation({ summary: 'Crear nuevo QR de asistencia' })
    async createQR(@Body() dto: CreateQRAsistenciaDto, @Request() req: any) {
        return this.asistenciaService.createQR(dto, this.getUserId(req));
    }

    @Get('qr')
    @Roles('admin', 'lider')
    @ApiOperation({ summary: 'Listar QRs de asistencia' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'activo', required: false, type: Boolean })
    async findAllQRs(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('activo') activo?: string,
    ) {
        return this.asistenciaService.findAllQRs({
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
            activo: activo !== undefined ? activo === 'true' : undefined,
        });
    }

    @Get('qrs-disponibles')
    @ApiOperation({ summary: 'Obtener QRs disponibles para registro (activos, en horario y no registrados aún)' })
    async getQRsDisponibles(@Request() req: any) {
        return this.asistenciaService.getQRsDisponibles(this.getUserId(req));
    }

    @Get('qr/:codigo')
    @ApiOperation({ summary: 'Obtener QR por código' })
    async findQRByCodigo(@Param('codigo') codigo: string) {
        return this.asistenciaService.findQRByCodigo(codigo);
    }

    @Patch('qr/:id/toggle')
    @Roles('admin', 'lider')
    @ApiOperation({ summary: 'Activar/desactivar QR' })
    async toggleQRActive(@Param('id', ParseIntPipe) id: number) {
        return this.asistenciaService.toggleQRActive(id);
    }

    @Patch('qr/:id')
    @Roles('admin', 'lider')
    @ApiOperation({ summary: 'Actualizar QR (fecha, horas, descripción)' })
    async updateQR(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateQRAsistenciaDto,
    ) {
        return this.asistenciaService.updateQR(id, dto);
    }

    // ==================== ASISTENCIA ENDPOINTS ====================

    @Post('registrar')
    @ApiOperation({ summary: 'Registrar mi asistencia' })
    async registrarAsistencia(
        @Body() dto: RegistrarAsistenciaDto,
        @Request() req: any,
    ) {
        return this.asistenciaService.registrarAsistencia(this.getUserId(req), dto);
    }

    @Post('registrar-manual')
    @Roles('admin', 'lider')
    @ApiOperation({ summary: 'Registrar asistencia manual de otro usuario' })
    async registrarAsistenciaManual(
        @Body() dto: RegistrarAsistenciaManualDto,
        @Request() req: any,
    ) {
        return this.asistenciaService.registrarAsistenciaManual(this.getUserId(req), dto);
    }

    @Get()
    @Roles('admin', 'lider')
    @ApiOperation({ summary: 'Listar asistencias con filtros' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'semanaInicio', required: false })
    @ApiQuery({ name: 'fechaDesde', required: false })
    @ApiQuery({ name: 'fechaHasta', required: false })
    @ApiQuery({ name: 'estado', required: false })
    @ApiQuery({ name: 'usuarioId', required: false, type: Number })
    @ApiQuery({ name: 'tipoId', required: false, type: Number })
    @ApiQuery({ name: 'metodoRegistro', required: false })
    async findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('semanaInicio') semanaInicio?: string,
        @Query('fechaDesde') fechaDesde?: string,
        @Query('fechaHasta') fechaHasta?: string,
        @Query('estado') estado?: string,
        @Query('usuarioId') usuarioId?: string,
        @Query('tipoId') tipoId?: string,
        @Query('metodoRegistro') metodoRegistro?: string,
    ) {
        return this.asistenciaService.findAllAsistencias({
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
            semanaInicio,
            fechaDesde,
            fechaHasta,
            estado,
            usuarioId: usuarioId ? parseInt(usuarioId, 10) : undefined,
            tipoId: tipoId ? parseInt(tipoId, 10) : undefined,
            metodoRegistro,
        });
    }

    @Get('exportar')
    @Roles('admin', 'lider')
    @ApiOperation({ summary: 'Exportar asistencias a Excel' })
    @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    @ApiQuery({ name: 'fechaDesde', required: false })
    @ApiQuery({ name: 'fechaHasta', required: false })
    @ApiQuery({ name: 'estado', required: false })
    @ApiQuery({ name: 'tipoId', required: false, type: Number })
    @ApiQuery({ name: 'metodoRegistro', required: false })
    async exportarExcel(
        @Query('fechaDesde') fechaDesde?: string,
        @Query('fechaHasta') fechaHasta?: string,
        @Query('estado') estado?: string,
        @Query('tipoId') tipoId?: string,
        @Query('metodoRegistro') metodoRegistro?: string,
        @Res() res?: Response,
    ) {
        const buffer = await this.asistenciaService.exportarAsistenciasExcel({
            fechaDesde,
            fechaHasta,
            estado,
            tipoId: tipoId ? parseInt(tipoId, 10) : undefined,
            metodoRegistro,
        });

        const filename = `asistencias_${new Date().toISOString().split('T')[0]}.xlsx`;
        res!.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res!.send(buffer);
    }

    @Patch(':id/confirmar')
    @Roles('admin', 'lider')
    @ApiOperation({ summary: 'Confirmar o rechazar asistencia' })
    async confirmarAsistencia(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ConfirmarAsistenciaDto,
        @Request() req: any,
    ) {
        return this.asistenciaService.confirmarAsistencia(id, dto, this.getUserId(req));
    }

    @Post('confirmar-multiples')
    @Roles('admin', 'lider')
    @ApiOperation({ summary: 'Confirmar múltiples asistencias' })
    async confirmarMultiples(
        @Body() body: { ids: number[]; estado: 'confirmado' | 'rechazado' },
        @Request() req: any,
    ) {
        return this.asistenciaService.confirmarMultiples(body.ids, body.estado, this.getUserId(req));
    }

    @Patch(':id/vincular-usuario')
    @Roles('admin', 'lider')
    @ApiOperation({ summary: 'Vincular asistencia a un usuario' })
    async vincularUsuario(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { usuarioId: number },
    ) {
        return this.asistenciaService.vincularUsuario(id, body.usuarioId);
    }

    // ==================== ESTADÍSTICAS ENDPOINTS ====================

    @Get('estadisticas')
    @Roles('admin', 'lider')
    @ApiOperation({ summary: 'Estadísticas generales de asistencia' })
    async getEstadisticasGenerales() {
        return this.asistenciaService.getEstadisticasGenerales();
    }

    @Get('estadisticas/semana')
    @Roles('admin', 'lider')
    @ApiOperation({ summary: 'Estadísticas de una semana específica' })
    @ApiQuery({ name: 'semanaInicio', required: true })
    async getEstadisticasSemana(@Query('semanaInicio') semanaInicio: string) {
        return this.asistenciaService.getEstadisticasSemana(new Date(semanaInicio));
    }

    @Get('mi-asistencia')
    @ApiOperation({ summary: 'Ver mi historial de asistencia' })
    async getMiAsistencia(@Request() req: any) {
        return this.asistenciaService.getMiAsistencia(this.getUserId(req));
    }
}
