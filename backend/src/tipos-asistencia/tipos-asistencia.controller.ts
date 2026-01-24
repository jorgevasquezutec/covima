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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { TiposAsistenciaService } from './tipos-asistencia.service';
import {
  CreateTipoAsistenciaDto,
  UpdateTipoAsistenciaDto,
  CreateCampoDto,
  UpdateCampoDto,
} from './dto';

@ApiTags('Tipos de Asistencia')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tipos-asistencia')
export class TiposAsistenciaController {
  constructor(private readonly tiposService: TiposAsistenciaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tipos de asistencia' })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  async findAll(@Query('activo') activo?: string) {
    return this.tiposService.findAll({
      activo: activo !== undefined ? activo === 'true' : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener tipo de asistencia por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tiposService.findOne(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear tipo de asistencia' })
  async create(@Body() dto: CreateTipoAsistenciaDto) {
    return this.tiposService.create(dto);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar tipo de asistencia' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoAsistenciaDto,
  ) {
    return this.tiposService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar tipo de asistencia' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.tiposService.delete(id);
  }

  // ==================== CAMPOS ====================

  @Post(':id/campos')
  @Roles('admin')
  @ApiOperation({ summary: 'Agregar campo al formulario' })
  async addCampo(
    @Param('id', ParseIntPipe) tipoId: number,
    @Body() dto: CreateCampoDto,
  ) {
    return this.tiposService.addCampo(tipoId, dto);
  }

  @Put('campos/:campoId')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar campo del formulario' })
  async updateCampo(
    @Param('campoId', ParseIntPipe) campoId: number,
    @Body() dto: UpdateCampoDto,
  ) {
    return this.tiposService.updateCampo(campoId, dto);
  }

  @Delete('campos/:campoId')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar campo del formulario' })
  async deleteCampo(@Param('campoId', ParseIntPipe) campoId: number) {
    return this.tiposService.deleteCampo(campoId);
  }

  @Put(':id/campos/reorder')
  @Roles('admin')
  @ApiOperation({ summary: 'Reordenar campos del formulario' })
  async reorderCampos(
    @Param('id', ParseIntPipe) tipoId: number,
    @Body() body: { campoIds: number[] },
  ) {
    return this.tiposService.reorderCampos(tipoId, body.campoIds);
  }
}
