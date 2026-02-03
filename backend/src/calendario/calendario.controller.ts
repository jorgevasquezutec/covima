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
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CalendarioService } from './calendario.service';
import {
  CreateActividadDto,
  UpdateActividadDto,
} from './dto';

@ApiTags('Calendario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('calendario')
export class CalendarioController {
  constructor(private readonly calendarioService: CalendarioService) {}

  private getUserId(req: any): number {
    return req.user.id;
  }

  // ==================== ACTIVIDADES ====================

  @Get('actividades')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Listar actividades con filtros' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'desde', required: false, description: 'Fecha inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'hasta', required: false, description: 'Fecha fin (YYYY-MM-DD)' })
  async findAllActividades(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.calendarioService.findAllActividades({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      desde,
      hasta,
    });
  }

  @Get('actividades/:id')
  @ApiOperation({ summary: 'Obtener detalle de una actividad' })
  async findActividadById(@Param('id', ParseIntPipe) id: number) {
    return this.calendarioService.findActividadById(id);
  }

  @Post('actividades')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Crear actividad' })
  async createActividad(@Body() dto: CreateActividadDto, @Request() req: any) {
    return this.calendarioService.createActividad(dto, this.getUserId(req));
  }

  @Put('actividades/:id')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Editar actividad' })
  async updateActividad(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActividadDto,
  ) {
    return this.calendarioService.updateActividad(id, dto);
  }

  @Delete('actividades/:id')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Eliminar actividad' })
  async deleteActividad(@Param('id', ParseIntPipe) id: number) {
    return this.calendarioService.deleteActividad(id);
  }

  @Delete('actividades/:id/serie')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Eliminar serie completa de actividades recurrentes' })
  async deleteSerieRecurrente(@Param('id', ParseIntPipe) id: number) {
    return this.calendarioService.deleteSerieRecurrente(id);
  }

  // ==================== CALENDARIO MES ====================

  @Get(':mes/:anio')
  @ApiOperation({ summary: 'Obtener calendario del mes con todas las actividades' })
  @ApiParam({ name: 'mes', description: 'Mes (1-12)', example: 2 })
  @ApiParam({ name: 'anio', description: 'Año', example: 2026 })
  async getCalendarioMes(
    @Param('mes', ParseIntPipe) mes: number,
    @Param('anio', ParseIntPipe) anio: number,
  ) {
    return this.calendarioService.getCalendarioMes(mes, anio);
  }
}
