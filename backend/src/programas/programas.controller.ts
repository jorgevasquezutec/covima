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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { ProgramasService } from './programas.service';
import { MediaService } from '../media/media.service';
import {
  CreateProgramaDto,
  CreateProgramaBatchDto,
  UpdateProgramaDto,
  CreateVisitaDto,
} from './dto';

@ApiTags('Programas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('programas')
export class ProgramasController {
  constructor(
    private readonly programasService: ProgramasService,
    private readonly mediaService: MediaService,
  ) {}

  @Get()
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Listar programas' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'estado', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('estado') estado?: string,
  ) {
    return this.programasService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      estado,
    });
  }

  @Get('mis-asignaciones')
  @ApiOperation({ summary: 'Obtener mis próximas asignaciones en programas' })
  async getMisAsignaciones(@Request() req: any) {
    return this.programasService.getMisProximasAsignaciones(req.user.id);
  }

  @Get('estadisticas-admin')
  @Roles('admin', 'lider')
  @ApiOperation({
    summary: 'Obtener estadísticas de programas para dashboard admin',
  })
  async getEstadisticasAdmin() {
    return this.programasService.getEstadisticasAdmin();
  }

  @Get('partes')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Obtener todas las partes activas del programa' })
  async getPartes() {
    return this.programasService.getPartes();
  }

  @Get('partes/all')
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener todas las partes (incluye inactivas)' })
  async getAllPartes() {
    return this.programasService.getAllPartes();
  }

  @Get('partes/obligatorias')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Obtener partes obligatorias del programa' })
  async getPartesObligatorias() {
    return this.programasService.getPartesObligatorias();
  }

  @Get('partes/opcionales')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Obtener partes opcionales del programa' })
  async getPartesOpcionales() {
    return this.programasService.getPartesOpcionales();
  }

  @Post('partes')
  @Roles('admin')
  @ApiOperation({ summary: 'Crear nueva parte del programa' })
  async createParte(
    @Body()
    body: {
      nombre: string;
      descripcion?: string;
      orden?: number;
      esFija?: boolean;
      esObligatoria?: boolean;
      textoFijo?: string;
      permiteFotos?: boolean;
      puntos?: number;
      xp?: number;
    },
  ) {
    return this.programasService.createParte(body);
  }

  @Put('partes/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar parte del programa' })
  async updateParte(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      nombre?: string;
      descripcion?: string;
      orden?: number;
      esFija?: boolean;
      esObligatoria?: boolean;
      textoFijo?: string;
      activo?: boolean;
      permiteFotos?: boolean;
      puntos?: number;
      xp?: number;
    },
  ) {
    return this.programasService.updateParte(id, body);
  }

  @Delete('partes/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar (desactivar) parte del programa' })
  async deleteParte(@Param('id', ParseIntPipe) id: number) {
    return this.programasService.deleteParte(id);
  }

  // ==================== PLANTILLAS ====================

  @Get('plantillas')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Listar plantillas de programa activas' })
  async getPlantillas() {
    return this.programasService.getPlantillas();
  }

  @Get('plantillas/:id')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Obtener plantilla con sus partes' })
  async getPlantilla(@Param('id', ParseIntPipe) id: number) {
    return this.programasService.getPlantilla(id);
  }

  @Post('plantillas')
  @Roles('admin')
  @ApiOperation({ summary: 'Crear nueva plantilla de programa' })
  async createPlantilla(
    @Body()
    body: {
      nombre: string;
      descripcion?: string;
      parteIds: number[];
      esDefault?: boolean;
    },
  ) {
    return this.programasService.createPlantilla(body);
  }

  @Put('plantillas/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar plantilla de programa' })
  async updatePlantilla(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      nombre?: string;
      descripcion?: string;
      activo?: boolean;
      esDefault?: boolean;
      parteIds?: number[];
    },
  ) {
    return this.programasService.updatePlantilla(id, body);
  }

  @Delete('plantillas/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar plantilla de programa' })
  async deletePlantilla(@Param('id', ParseIntPipe) id: number) {
    return this.programasService.deletePlantilla(id);
  }

  @Get('proximo')
  @ApiOperation({
    summary: 'Obtener el próximo programa con todas sus partes y asignaciones',
  })
  async getProximoPrograma() {
    return this.programasService.getProximoPrograma();
  }

  @Get('usuarios')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Obtener usuarios disponibles para asignar' })
  @ApiQuery({ name: 'search', required: false })
  async getUsuarios(@Query('search') search?: string) {
    return this.programasService.getUsuariosParaAsignar(search);
  }

  @Post('fotos/upload')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Subir foto para una parte del programa' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: diskStorage({
        destination: './uploads/programas',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `programa-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (
          !file.mimetype.match(
            /^(image\/(jpg|jpeg|png|gif|webp)|video\/(mp4|webm|quicktime))$/,
          )
        ) {
          return callback(
            new BadRequestException(
              'Solo se permiten imágenes (jpg, png, gif, webp) y videos (mp4, webm, mov)',
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  async uploadFotoPrograma(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ninguna imagen');
    }
    const url = `/uploads/programas/${file.filename}`;
    const mediaItem = await this.mediaService.create({
      url,
      nombreOriginal: file.originalname,
      mimeType: file.mimetype,
      tamanio: file.size,
      subidoPor: req.user?.id,
    });
    return { url, mediaItemId: mediaItem.id };
  }

  // ==================== VISITAS ====================

  @Get('visitas/hoy')
  @Roles('admin', 'lider')
  @ApiOperation({
    summary: 'Obtener programas del día para registro de visitas',
  })
  async getProgramasHoyVisitas() {
    return this.programasService.getProgramasHoyParaVisitas();
  }

  @Get(':id/visitas')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Listar visitas de un programa' })
  async getVisitas(@Param('id', ParseIntPipe) id: number) {
    return this.programasService.getVisitasByPrograma(id);
  }

  @Post(':id/visitas')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Registrar visita en un programa' })
  async createVisita(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateVisitaDto,
  ) {
    return this.programasService.createVisita(id, dto);
  }

  @Delete('visitas/:visitaId')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Eliminar visita' })
  async deleteVisita(@Param('visitaId', ParseIntPipe) visitaId: number) {
    return this.programasService.deleteVisita(visitaId);
  }

  // ==================== PROGRAMA ====================

  @Get(':id')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Obtener programa por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.programasService.findOne(id);
  }

  @Post('batch')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Crear múltiples programas en una transacción' })
  async createBatch(@Body() dto: CreateProgramaBatchDto, @Request() req: any) {
    return this.programasService.createBatch(dto, req.user.id);
  }

  @Post()
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Crear programa' })
  async create(@Body() dto: CreateProgramaDto, @Request() req: any) {
    return this.programasService.create(dto, req.user.id);
  }

  @Put(':id')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Actualizar programa' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProgramaDto,
  ) {
    return this.programasService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Eliminar programa' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.programasService.delete(id);
  }

  @Post(':id/generar-texto')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Generar texto del programa para WhatsApp' })
  async generarTexto(@Param('id', ParseIntPipe) id: number) {
    return this.programasService.generarTexto(id);
  }

  @Get(':id/preview-notificaciones')
  @Roles('admin', 'lider')
  @ApiOperation({
    summary: 'Preview de notificaciones WhatsApp',
    description:
      'Agrupa las partes asignadas por usuario y genera el mensaje de notificación. Solo incluye usuarios con teléfono.',
  })
  async previewNotificaciones(@Param('id', ParseIntPipe) id: number) {
    return this.programasService.previewNotificaciones(id);
  }

  @Post(':id/enviar-notificaciones')
  @Roles('admin', 'lider')
  @ApiOperation({
    summary: 'Enviar notificaciones WhatsApp a participantes',
    description:
      'Envía mensajes personalizados a cada participante con sus partes asignadas vía WhatsApp/Chatwoot. Opcionalmente envía solo a usuarios específicos.',
  })
  async enviarNotificaciones(
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { usuarioIds?: number[] },
  ) {
    return this.programasService.enviarNotificaciones(id, body?.usuarioIds);
  }

  @Get(':id/preview-finalizacion')
  @Roles('admin', 'lider')
  @ApiOperation({
    summary: 'Preview de finalización de programa',
    description:
      'Muestra los puntos que se asignarían al finalizar sin ejecutar la acción.',
  })
  async previewFinalizarPrograma(@Param('id', ParseIntPipe) id: number) {
    return this.programasService.previewFinalizarPrograma(id);
  }

  @Post(':id/finalizar')
  @Roles('admin', 'lider')
  @ApiOperation({
    summary: 'Finalizar programa y asignar puntos de gamificación',
    description:
      'Marca el programa como finalizado y asigna puntos de participación a todos los usuarios asignados.',
  })
  async finalizarPrograma(@Param('id', ParseIntPipe) id: number) {
    return this.programasService.finalizarPrograma(id);
  }
}
