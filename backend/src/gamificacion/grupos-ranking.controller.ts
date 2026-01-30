import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { GruposRankingService } from './grupos-ranking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import {
  CrearGrupoRankingDto,
  ActualizarGrupoRankingDto,
  AgregarMiembrosDto,
  ToggleOcultoDto,
  SetParticipaRankingDto,
} from './dto/grupo-ranking.dto';

@Controller('gamificacion/grupos-ranking')
@UseGuards(JwtAuthGuard)
export class GruposRankingController {
  constructor(private readonly gruposService: GruposRankingService) {}

  // Obtener grupos visibles para el usuario actual
  @Get()
  async getGruposVisibles(@Request() req) {
    return this.gruposService.getGruposVisibles(req.user.id, req.user.roles);
  }

  // [Admin] Obtener todos los grupos
  @Get('admin/todos')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllGrupos() {
    return this.gruposService.getAllGrupos();
  }

  // Obtener mi visibilidad en rankings
  @Get('mi-visibilidad')
  async getMiVisibilidad(@Request() req) {
    return this.gruposService.getMiVisibilidad(req.user.id);
  }

  // Obtener mis posiciones en todos los grupos
  @Get('mis-posiciones')
  async getMisPosiciones(@Request() req) {
    return this.gruposService.getMisPosicionesEnGrupos(req.user.id);
  }

  // Obtener un grupo por ID
  @Get(':id')
  async getGrupo(@Param('id', ParseIntPipe) id: number) {
    return this.gruposService.getGrupo(id);
  }

  // Obtener miembros de un grupo (funciona para sistema y personalizados)
  @Get(':id/miembros')
  async getMiembrosGrupo(@Param('id', ParseIntPipe) id: number) {
    return this.gruposService.getMiembrosGrupo(id);
  }

  // Obtener ranking de un grupo
  @Get(':id/ranking')
  async getRankingGrupo(
    @Param('id', ParseIntPipe) id: number,
    @Query('periodoId') periodoId?: string,
    @Query('limit') limit?: string,
    @Request() req?,
  ) {
    return this.gruposService.getRankingGrupo(
      id,
      req.user.id,
      periodoId ? parseInt(periodoId) : undefined,
      limit ? parseInt(limit) : 50,
    );
  }

  // [Admin/Lider] Crear grupo personalizado
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  async crearGrupo(@Body() dto: CrearGrupoRankingDto, @Request() req) {
    return this.gruposService.crearGrupo(dto, req.user.id);
  }

  // [Admin] Actualizar grupo
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async actualizarGrupo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarGrupoRankingDto,
  ) {
    return this.gruposService.actualizarGrupo(id, dto);
  }

  // [Admin] Convertir grupo sistema a personalizado
  @Post(':id/convertir')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async convertirAPersonalizado(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.gruposService.convertirAPersonalizado(id, req.user.id);
  }

  // [Admin] Eliminar grupo
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async eliminarGrupo(@Param('id', ParseIntPipe) id: number) {
    return this.gruposService.eliminarGrupo(id);
  }

  // [Admin/Lider] Agregar miembros a un grupo
  @Post(':id/miembros')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  async agregarMiembros(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AgregarMiembrosDto,
    @Request() req,
  ) {
    return this.gruposService.agregarMiembros(id, dto.usuariosIds, req.user.id);
  }

  // [Admin/Lider] Quitar miembro de un grupo
  @Delete(':id/miembros/:usuarioId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  async quitarMiembro(
    @Param('id', ParseIntPipe) id: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
  ) {
    return this.gruposService.quitarMiembro(id, usuarioId);
  }

  // Toggle mi visibilidad en ranking general
  @Put('mi-visibilidad/general')
  async toggleOcultoGeneral(@Body() dto: ToggleOcultoDto, @Request() req) {
    return this.gruposService.toggleOcultoGeneral(req.user.id, dto.oculto);
  }

  // Toggle mi visibilidad en un grupo específico
  @Put('mi-visibilidad/:grupoId')
  async toggleOcultoGrupo(
    @Param('grupoId', ParseIntPipe) grupoId: number,
    @Body() dto: ToggleOcultoDto,
    @Request() req,
  ) {
    return this.gruposService.toggleOcultoGrupo(
      grupoId,
      req.user.id,
      dto.oculto,
    );
  }

  // [Admin] Cambiar participación de un usuario en rankings
  @Put('usuarios/:usuarioId/participacion')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async setParticipaEnRanking(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() dto: SetParticipaRankingDto,
  ) {
    return this.gruposService.setParticipaEnRanking(usuarioId, dto.participa);
  }
}
