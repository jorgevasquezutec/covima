import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto, UpdateUsuarioDto, ResetPasswordDto } from './dto';

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'rol', required: false })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('search') search?: string,
    @Query('rol') rol?: string,
    @Query('activo') activo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usuariosService.findAll({
      search,
      rol,
      activo: activo !== undefined ? activo === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('roles')
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener lista de roles' })
  async getRoles() {
    return this.usuariosService.getRoles();
  }

  @Get('cumpleanos-mes')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Obtener cumpleaños de un mes específico' })
  @ApiQuery({
    name: 'mes',
    required: false,
    type: Number,
    description: 'Mes (1-12)',
  })
  @ApiQuery({ name: 'anio', required: false, type: Number, description: 'Año' })
  async getCumpleanosDelMes(
    @Query('mes') mes?: string,
    @Query('anio') anio?: string,
  ) {
    return this.usuariosService.getCumpleanosDelMes(
      mes ? parseInt(mes, 10) : undefined,
      anio ? parseInt(anio, 10) : undefined,
    );
  }

  @Get('profile/me')
  @ApiOperation({ summary: 'Obtener mi perfil' })
  async getMyProfile(@Request() req: any) {
    return this.usuariosService.getProfile(req.user.id);
  }

  @Patch('profile/me')
  @ApiOperation({ summary: 'Actualizar mi perfil' })
  async updateMyProfile(
    @Request() req: any,
    @Body()
    body: {
      nombre?: string;
      email?: string;
      fotoUrl?: string;
      fechaNacimiento?: string;
      direccion?: string;
      tipoDocumento?: string;
      numeroDocumento?: string;
      tallaPolo?: string;
      esBautizado?: boolean;
      biografia?: string;
      notificarNuevasConversaciones?: boolean;
      modoHandoffDefault?: 'WEB' | 'WHATSAPP' | 'AMBOS';
    },
  ) {
    return this.usuariosService.updateProfile(req.user.id, {
      ...body,
      fechaNacimiento: body.fechaNacimiento
        ? new Date(body.fechaNacimiento)
        : undefined,
    });
  }

  @Post('profile/me/foto')
  @ApiOperation({ summary: 'Subir foto de perfil' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        foto: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `avatar-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(
            new BadRequestException('Solo se permiten imágenes'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadProfilePhoto(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ninguna imagen');
    }
    const fotoUrl = `/uploads/avatars/${file.filename}`;
    return this.usuariosService.updateProfile(req.user.id, { fotoUrl });
  }

  // ==================== SEGUIMIENTO DE INACTIVIDAD ====================

  @Get('inactivos')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Listar usuarios por nivel de actividad' })
  @ApiQuery({
    name: 'nivel',
    required: false,
    enum: ['critico', 'en_riesgo', 'activo', 'todos'],
  })
  @ApiQuery({ name: 'nivelGamificacionId', required: false, type: Number })
  @ApiQuery({
    name: 'ordenarPor',
    required: false,
    enum: ['ultimaAsistencia', 'ultimaActividad', 'nombre'],
  })
  @ApiQuery({ name: 'orden', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'busqueda', required: false, type: String })
  async getUsuariosInactivos(
    @Query('nivel') nivel?: 'critico' | 'en_riesgo' | 'activo' | 'todos',
    @Query('nivelGamificacionId') nivelGamificacionId?: string,
    @Query('ordenarPor')
    ordenarPor?: 'ultimaAsistencia' | 'ultimaActividad' | 'nombre',
    @Query('orden') orden?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    return this.usuariosService.getUsuariosInactivos({
      nivel,
      nivelGamificacionId: nivelGamificacionId
        ? parseInt(nivelGamificacionId, 10)
        : undefined,
      ordenarPor,
      orden,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      busqueda,
    });
  }

  @Get('inactivos/resumen')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Resumen de inactividad' })
  async getResumenInactividad() {
    return this.usuariosService.getResumenInactividad();
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.findOne(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear usuario' })
  async create(@Body() dto: CreateUsuarioDto, @Request() req: any) {
    return this.usuariosService.create(dto, req.user.id);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar usuario' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioDto,
  ) {
    return this.usuariosService.update(id, dto);
  }

  @Patch(':id/reset-password')
  @Roles('admin')
  @ApiOperation({ summary: 'Resetear contraseña de usuario' })
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usuariosService.resetPassword(id, dto);
  }

  @Patch(':id/toggle-active')
  @Roles('admin')
  @ApiOperation({ summary: 'Activar/Desactivar usuario' })
  async toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.toggleActive(id);
  }

  @Patch(':id/toggle-ranking')
  @Roles('admin')
  @ApiOperation({ summary: 'Incluir/Excluir usuario del ranking' })
  async toggleRanking(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.toggleRanking(id);
  }

  @Patch(':id/telefono')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar teléfono de usuario (solo admin)' })
  async updateTelefono(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { codigoPais: string; telefono: string },
  ) {
    return this.usuariosService.updateTelefono(
      id,
      body.codigoPais,
      body.telefono,
    );
  }

  @Post(':id/foto')
  @Roles('admin')
  @ApiOperation({ summary: 'Subir foto de perfil de usuario (solo admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        foto: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `avatar-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(
            new BadRequestException('Solo se permiten imágenes'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadUserPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ninguna imagen');
    }
    const fotoUrl = `/uploads/avatars/${file.filename}`;
    return this.usuariosService.updateProfile(id, { fotoUrl });
  }
}
