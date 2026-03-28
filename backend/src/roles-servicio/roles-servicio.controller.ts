import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { RolesServicioService } from './roles-servicio.service';
import {
  CreateTipoRolDto,
  UpdateTipoRolDto,
  AgregarMiembrosRolDto,
  ReorderMiembrosDto,
  GenerarTurnosDto,
  CreateTurnoDto,
  UpdateTurnoDto,
} from './dto';

@ApiTags('Roles de Servicio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles-servicio')
export class RolesServicioController {
  constructor(private readonly rolesServicioService: RolesServicioService) {}

  private getUserId(req: any): number {
    return req.user.id;
  }

  // ==================== TIPOS ====================

  @Get('tipos')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Listar tipos de rol de servicio' })
  async findAllTipos() {
    return this.rolesServicioService.findAllTipos();
  }

  @Post('tipos')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Crear tipo de rol de servicio' })
  async createTipo(@Body() dto: CreateTipoRolDto) {
    return this.rolesServicioService.createTipo(dto);
  }

  @Put('tipos/:id')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Actualizar tipo de rol de servicio' })
  async updateTipo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoRolDto,
  ) {
    return this.rolesServicioService.updateTipo(id, dto);
  }

  @Delete('tipos/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar tipo de rol de servicio' })
  async deleteTipo(@Param('id', ParseIntPipe) id: number) {
    return this.rolesServicioService.deleteTipo(id);
  }

  // ==================== MIEMBROS ====================

  @Get('tipos/:id/miembros')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Listar miembros del pool de un tipo de rol' })
  async findMiembros(@Param('id', ParseIntPipe) id: number) {
    return this.rolesServicioService.findMiembros(id);
  }

  @Post('tipos/:id/miembros')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Agregar miembros al pool' })
  async agregarMiembros(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AgregarMiembrosRolDto,
  ) {
    return this.rolesServicioService.agregarMiembros(id, dto);
  }

  @Delete('miembros/:id')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Quitar miembro del pool' })
  async removeMiembro(@Param('id', ParseIntPipe) id: number) {
    return this.rolesServicioService.removeMiembro(id);
  }

  @Post('tipos/:id/miembros/reorder')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Reordenar miembros del pool' })
  async reorderMiembros(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReorderMiembrosDto,
  ) {
    return this.rolesServicioService.reorderMiembros(id, dto);
  }

  // ==================== TURNOS ====================

  @Get('tipos/:id/turnos')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Listar turnos de un tipo de rol' })
  @ApiQuery({ name: 'desde', required: false, description: 'Fecha inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'hasta', required: false, description: 'Fecha fin (YYYY-MM-DD)' })
  async findTurnos(
    @Param('id', ParseIntPipe) id: number,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.rolesServicioService.findTurnos(id, desde, hasta);
  }

  @Post('tipos/:id/turnos')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Crear turno manual' })
  async createTurno(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTurnoDto,
    @Request() req: any,
  ) {
    return this.rolesServicioService.createTurno(id, dto, this.getUserId(req));
  }

  @Post('tipos/:id/generar')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Generar rotación automática de turnos' })
  async generarRotacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GenerarTurnosDto,
    @Request() req: any,
  ) {
    return this.rolesServicioService.generarRotacion(id, dto, this.getUserId(req));
  }

  @Put('turnos/:id')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Editar turno (cambiar asignados, notas)' })
  async updateTurno(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTurnoDto,
  ) {
    return this.rolesServicioService.updateTurno(id, dto);
  }

  @Put('turnos/:id/completar')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Marcar turno como completado y asignar puntos' })
  async completarTurno(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.rolesServicioService.completarTurno(id, this.getUserId(req));
  }

  @Delete('turnos/:id')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Eliminar turno' })
  async eliminarTurno(@Param('id', ParseIntPipe) id: number) {
    return this.rolesServicioService.eliminarTurno(id);
  }

  @Post('turnos/:id/notificar')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Enviar notificación WhatsApp a asignados del turno' })
  async notificarTurno(@Param('id', ParseIntPipe) id: number) {
    return this.rolesServicioService.notificarTurno(id);
  }
}
