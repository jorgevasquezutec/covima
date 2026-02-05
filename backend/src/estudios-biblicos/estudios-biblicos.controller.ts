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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { EstudiosBiblicosService } from './estudios-biblicos.service';

@ApiTags('Estudios Bíblicos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('estudios-biblicos')
export class EstudiosBiblicosController {
  constructor(private readonly service: EstudiosBiblicosService) {}

  @Get('cursos')
  @ApiOperation({ summary: 'Listar cursos bíblicos disponibles' })
  async getCursos() {
    return this.service.getCursos();
  }

  @Get('mis-estudiantes')
  @ApiOperation({ summary: 'Obtener mis estudiantes bíblicos' })
  async getMisEstudiantes(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('cursoId') cursoId?: string,
  ) {
    return this.service.getMisEstudiantes(req.user.id, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      cursoId: cursoId ? parseInt(cursoId) : undefined,
    });
  }

  @Get('estadisticas')
  @ApiOperation({ summary: 'Obtener estadísticas de mis estudiantes' })
  async getEstadisticas(@Request() req: any) {
    return this.service.getEstadisticas(req.user.id);
  }

  @Get('estadisticas-global')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Estadísticas globales de todos los estudiantes bíblicos' })
  async getEstadisticasGlobal() {
    return this.service.getEstadisticasGlobal();
  }

  @Get('estudiantes/:id')
  @ApiOperation({ summary: 'Obtener detalle de un estudiante' })
  async getEstudiante(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.service.getEstudiante(id, req.user.id);
  }

  @Post('estudiantes')
  @ApiOperation({ summary: 'Crear nuevo estudiante bíblico' })
  async createEstudiante(
    @Body()
    body: {
      nombre: string;
      fechaNacimiento?: string;
      estadoCivil?: string;
      telefono?: string;
      direccion?: string;
      notas?: string;
      cursoId: number;
    },
    @Request() req: any,
  ) {
    return this.service.createEstudiante(req.user.id, {
      ...body,
      fechaNacimiento: body.fechaNacimiento
        ? new Date(body.fechaNacimiento)
        : undefined,
    });
  }

  @Put('estudiantes/:id')
  @ApiOperation({ summary: 'Actualizar estudiante bíblico' })
  async updateEstudiante(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      nombre?: string;
      fechaNacimiento?: string;
      estadoCivil?: string;
      telefono?: string;
      direccion?: string;
      notas?: string;
      cursoId?: number;
      fechaBautismo?: string;
    },
    @Request() req: any,
  ) {
    return this.service.updateEstudiante(id, req.user.id, {
      ...body,
      fechaNacimiento: body.fechaNacimiento
        ? new Date(body.fechaNacimiento)
        : undefined,
      fechaBautismo: body.fechaBautismo
        ? new Date(body.fechaBautismo)
        : undefined,
    });
  }

  @Delete('estudiantes/:id')
  @ApiOperation({ summary: 'Eliminar estudiante bíblico' })
  async deleteEstudiante(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.service.deleteEstudiante(id, req.user.id);
  }

  @Post('estudiantes/:id/lecciones/:leccion/toggle')
  @ApiOperation({ summary: 'Marcar/desmarcar lección como completada' })
  async toggleLeccion(
    @Param('id', ParseIntPipe) id: number,
    @Param('leccion', ParseIntPipe) leccion: number,
    @Request() req: any,
  ) {
    return this.service.toggleLeccion(id, leccion, req.user.id);
  }
}
