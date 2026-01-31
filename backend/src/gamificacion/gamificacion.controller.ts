import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { GamificacionService } from './gamificacion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { RankingFilterDto } from './dto/ranking-filter.dto';
import {
  RegistrarEventoDto,
  ActualizarPuntajeDto,
  CrearEventoDto,
  ActualizarEventoDto,
} from './dto/registrar-evento.dto';
import { CrearPeriodoDto, ActualizarPeriodoDto } from './dto/periodo.dto';
import { CategoriaAccion } from '@prisma/client';

@Controller('gamificacion')
@UseGuards(JwtAuthGuard)
export class GamificacionController {
  constructor(private readonly gamificacionService: GamificacionService) {}

  // Mi progreso completo
  @Get('mi-progreso')
  async getMiProgreso(@Request() req) {
    return this.gamificacionService.getMiProgreso(req.user.id);
  }

  // Mis posiciones en los rankings de grupos
  @Get('mis-posiciones-ranking')
  async getMisPosicionesRanking(@Request() req) {
    return this.gamificacionService.getMisPosicionesRanking(req.user.id);
  }

  // Estadísticas para dashboard personal
  @Get('mi-dashboard')
  async getMiDashboard(@Request() req) {
    return this.gamificacionService.getEstadisticasDashboard(req.user.id);
  }

  // Estadísticas globales del equipo (admin/lider)
  @Get('dashboard-equipo')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  async getDashboardEquipo() {
    return this.gamificacionService.getEstadisticasDashboard();
  }

  // Mi historial completo de puntos (con paginación y filtro por período)
  @Get('mi-historial')
  async getMiHistorial(
    @Request() req,
    @Query('periodoId') periodoId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.gamificacionService.getMiHistorial(
      req.user.id,
      periodoId ? parseInt(periodoId) : undefined,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // Mis estadísticas por período (resumen de todos los períodos)
  @Get('mis-periodos')
  async getMisPeriodos(@Request() req) {
    return this.gamificacionService.getMisPeriodos(req.user.id);
  }

  // Ranking trimestral
  @Get('ranking')
  async getRanking(@Query() filtros: RankingFilterDto) {
    return this.gamificacionService.getRanking(filtros);
  }

  // Rankings por nivel (todos los niveles con top 3)
  @Get('ranking-por-nivel')
  async getRankingsPorNivel(@Query('periodoId') periodoId?: string) {
    return this.gamificacionService.getRankingsPorNivel(
      periodoId ? parseInt(periodoId) : undefined,
    );
  }

  // Ranking de un nivel específico
  @Get('ranking-nivel/:nivelId')
  async getRankingNivel(
    @Param('nivelId', ParseIntPipe) nivelId: number,
    @Query('periodoId') periodoId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.gamificacionService.getRankingNivel(
      nivelId,
      periodoId ? parseInt(periodoId) : undefined,
      limit ? parseInt(limit) : 50,
    );
  }

  // Mi posición en mi nivel actual
  @Get('mi-posicion-nivel')
  async getMiPosicionEnNivel(@Request() req) {
    return this.gamificacionService.getMiPosicionEnNivel(req.user.id);
  }

  // Lista de niveles
  @Get('niveles')
  async getNiveles(@Query('incluirInactivos') incluirInactivos?: string) {
    if (incluirInactivos === 'true') {
      return this.gamificacionService.getNivelesAdmin();
    }
    return this.gamificacionService.getNiveles();
  }

  // [Admin] Obtener nivel por ID
  @Get('niveles/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getNivel(@Param('id', ParseIntPipe) id: number) {
    return this.gamificacionService.getNivel(id);
  }

  // [Admin] Crear nivel (XP se calcula automáticamente)
  @Post('niveles')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async crearNivel(
    @Body()
    dto: {
      numero: number;
      nombre: string;
      descripcion?: string;
      icono?: string;
      color?: string;
    },
  ) {
    return this.gamificacionService.crearNivel(dto);
  }

  // [Admin] Actualizar nivel (XP se recalcula si cambia el número)
  @Put('niveles/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async actualizarNivel(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    dto: {
      numero?: number;
      nombre?: string;
      descripcion?: string;
      icono?: string;
      color?: string;
      activo?: boolean;
    },
  ) {
    return this.gamificacionService.actualizarNivel(id, dto);
  }

  // [Admin] Eliminar nivel
  @Delete('niveles/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async eliminarNivel(@Param('id', ParseIntPipe) id: number) {
    return this.gamificacionService.eliminarNivel(id);
  }

  // [Admin] Recalcular XP de todos los niveles
  @Post('niveles/recalcular-xp')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async recalcularXp() {
    return this.gamificacionService.recalcularTodosLosXp();
  }

  // Mis insignias (todas, mostrando cuáles están desbloqueadas)
  @Get('insignias')
  async getMisInsignias(@Request() req) {
    return this.gamificacionService.getMisInsignias(req.user.id);
  }

  // Eventos especiales disponibles
  @Get('eventos-especiales')
  async getEventosEspeciales() {
    return this.gamificacionService.getEventosEspeciales();
  }

  // === ADMIN ENDPOINTS ===

  // Configuración de puntajes
  @Get('config-puntajes')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  async getConfigPuntajes() {
    return this.gamificacionService.getConfigPuntajes();
  }

  // Editar configuración de puntaje
  @Put('config-puntajes/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateConfigPuntaje(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: ActualizarPuntajeDto,
  ) {
    return this.gamificacionService.updateConfigPuntaje(id, data);
  }

  // Registrar evento especial
  @Post('registrar-evento')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  async registrarEvento(@Body() dto: RegistrarEventoDto, @Request() req) {
    return this.gamificacionService.registrarEvento(dto, req.user.id);
  }

  // === CRUD EVENTOS ESPECIALES ===

  // Crear evento especial
  @Post('eventos-especiales')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async crearEvento(@Body() dto: CrearEventoDto) {
    return this.gamificacionService.crearEvento(dto);
  }

  // Actualizar evento especial
  @Put('eventos-especiales/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async actualizarEvento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarEventoDto,
  ) {
    return this.gamificacionService.actualizarEvento(id, dto);
  }

  // Eliminar evento especial (soft delete - desactivar)
  @Delete('eventos-especiales/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async eliminarEvento(@Param('id', ParseIntPipe) id: number) {
    return this.gamificacionService.eliminarEvento(id);
  }

  // === CRUD PERÍODOS DE RANKING ===

  // Listar todos los períodos
  @Get('periodos')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  async getPeriodos(@Query('incluirCerrados') incluirCerrados?: string) {
    return this.gamificacionService.getPeriodos(incluirCerrados !== 'false');
  }

  // Obtener período activo
  @Get('periodos/activo')
  async getPeriodoActivo() {
    const periodo = await this.gamificacionService.getPeriodoActivo();
    return periodo || { mensaje: 'No hay período activo' };
  }

  // Obtener período por ID
  @Get('periodos/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  async getPeriodo(@Param('id', ParseIntPipe) id: number) {
    return this.gamificacionService.getPeriodo(id);
  }

  // Crear nuevo período
  @Post('periodos')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async crearPeriodo(@Body() dto: CrearPeriodoDto, @Request() req) {
    return this.gamificacionService.crearPeriodo(dto, req.user.id);
  }

  // Actualizar período
  @Put('periodos/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async actualizarPeriodo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPeriodoDto,
  ) {
    return this.gamificacionService.actualizarPeriodo(id, dto);
  }

  // Cerrar período
  @Post('periodos/:id/cerrar')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async cerrarPeriodo(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.gamificacionService.cerrarPeriodo(id, req.user.id);
  }

  // Reactivar período cerrado
  @Post('periodos/:id/reactivar')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async reactivarPeriodo(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.gamificacionService.reactivarPeriodo(id, req.user.id);
  }

  // Pausar período
  @Post('periodos/:id/pausar')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async pausarPeriodo(@Param('id', ParseIntPipe) id: number) {
    return this.gamificacionService.pausarPeriodo(id);
  }

  // Reanudar período pausado
  @Post('periodos/:id/reanudar')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async reanudarPeriodo(@Param('id', ParseIntPipe) id: number) {
    return this.gamificacionService.reanudarPeriodo(id);
  }

  // Eliminar período (solo si no tiene puntos)
  @Delete('periodos/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async eliminarPeriodo(@Param('id', ParseIntPipe) id: number) {
    return this.gamificacionService.eliminarPeriodo(id);
  }

  // === ADMIN: HISTORIAL DE PUNTOS ===

  // Obtener historial de todos los usuarios (admin)
  @Get('admin/historial')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  async getHistorialAdmin(
    @Query('usuarioId') usuarioId?: string,
    @Query('periodoId') periodoId?: string,
    @Query('categoria') categoria?: CategoriaAccion,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.gamificacionService.getHistorialAdmin({
      usuarioId: usuarioId ? parseInt(usuarioId) : undefined,
      periodoId: periodoId ? parseInt(periodoId) : undefined,
      categoria,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // Obtener una entrada del historial por ID
  @Get('admin/historial/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  async getHistorialEntry(@Param('id', ParseIntPipe) id: number) {
    return this.gamificacionService.getHistorialEntry(id);
  }

  // Actualizar una entrada del historial
  @Put('admin/historial/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateHistorialEntry(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { puntos?: number; xp?: number; descripcion?: string },
  ) {
    return this.gamificacionService.updateHistorialEntry(id, dto);
  }

  // Eliminar una entrada del historial
  @Delete('admin/historial/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async deleteHistorialEntry(@Param('id', ParseIntPipe) id: number) {
    return this.gamificacionService.deleteHistorialEntry(id);
  }
}
