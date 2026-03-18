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
  @ApiOperation({
    summary: 'Estadísticas globales de todos los estudiantes bíblicos',
  })
  async getEstadisticasGlobal() {
    return this.service.getEstadisticasGlobal();
  }

  // =============================================
  // INTERESADOS
  // =============================================

  @Get('interesados/estadisticas')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Estadísticas de interesados' })
  async getEstadisticasInteresados() {
    return this.service.getEstadisticasInteresados();
  }

  @Get('interesados/instructores')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Listar usuarios disponibles como instructores' })
  async getInstructores() {
    return this.service.getInstructores();
  }

  @Get('interesados')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Listar interesados con filtros y paginación' })
  async getInteresados(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('estado') estado?: string,
    @Query('instructorId') instructorId?: string,
    @Query('sinAsignar') sinAsignar?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getInteresados({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      estado,
      instructorId: instructorId ? parseInt(instructorId) : undefined,
      sinAsignar: sinAsignar === 'true',
      search,
    });
  }

  @Post('interesados/bulk')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Crear interesados en masa' })
  async createInteresadosBulk(
    @Body()
    body: {
      items: {
        nombre: string;
        edad: number;
        telefono: string;
        direccion?: string;
        notas?: string;
      }[];
    },
    @Request() req: any,
  ) {
    return this.service.createInteresadosBulk(req.user.id, body.items);
  }

  @Post('interesados/asignar-masivo')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Asignar instructor a múltiples interesados' })
  async asignarMasivo(@Body() body: { ids: number[]; instructorId: number }) {
    return this.service.asignarMasivo(body.ids, body.instructorId);
  }

  @Post('interesados')
  @ApiOperation({ summary: 'Crear un interesado' })
  async createInteresado(
    @Body()
    body: {
      nombre: string;
      edad: number;
      telefono: string;
      direccion?: string;
      notas?: string;
    },
    @Request() req: any,
  ) {
    return this.service.createInteresado(req.user.id, body);
  }

  @Get('mis-interesados')
  @ApiOperation({ summary: 'Obtener mis interesados asignados' })
  async getMisInteresados(@Request() req: any) {
    return this.service.getMisInteresados(req.user.id);
  }

  @Put('interesados/:id/estado')
  @ApiOperation({ summary: 'Cambiar estado de un interesado' })
  async updateEstadoInteresado(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { estado: string },
    @Request() req: any,
  ) {
    return this.service.updateEstadoInteresado(id, body.estado, req.user.id);
  }

  @Post('interesados/:id/asignar')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Asignar instructor a un interesado' })
  async asignarInstructor(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { instructorId: number },
  ) {
    return this.service.asignarInstructor(id, body.instructorId);
  }

  @Post('interesados/:id/convertir')
  @ApiOperation({ summary: 'Convertir interesado en estudiante bíblico' })
  async convertirInteresado(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { cursoId: number },
    @Request() req: any,
  ) {
    return this.service.convertirInteresado(id, body.cursoId, req.user.id);
  }

  @Put('interesados/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Actualizar un interesado' })
  async updateInteresado(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      nombre?: string;
      edad?: number;
      telefono?: string;
      direccion?: string;
      notas?: string;
    },
  ) {
    return this.service.updateInteresado(id, body);
  }

  @Delete('interesados/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Eliminar un interesado (soft delete)' })
  async deleteInteresado(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteInteresado(id);
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
