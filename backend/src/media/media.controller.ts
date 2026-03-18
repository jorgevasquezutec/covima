import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
  Request,
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
import { MediaService } from './media.service';
import { TagMedia } from '@prisma/client';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Listar biblioteca de medios' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tag', required: false, enum: TagMedia })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('tag') tag?: string,
  ) {
    return this.mediaService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      tag: tag && Object.values(TagMedia).includes(tag as TagMedia)
        ? (tag as TagMedia)
        : undefined,
    });
  }

  @Post('upload')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Subir archivo a la biblioteca de medios' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/media',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `media-${uniqueSuffix}${ext}`);
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
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
    @Body('nombre') nombre?: string,
    @Body('tag') tag?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    const url = `/uploads/media/${file.filename}`;
    const mediaItem = await this.mediaService.create({
      url,
      nombre: nombre || undefined,
      nombreOriginal: file.originalname,
      mimeType: file.mimetype,
      tamanio: file.size,
      subidoPor: req.user?.id,
      tag: tag && Object.values(TagMedia).includes(tag as TagMedia) ? (tag as TagMedia) : undefined,
    });

    return mediaItem;
  }

  @Post('download-youtube')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Descargar video de YouTube a la biblioteca' })
  async downloadYouTube(
    @Body() body: { url: string; nombre?: string; linkId?: number },
    @Request() req: any,
  ) {
    return this.mediaService.downloadYouTube({
      url: body.url,
      nombre: body.nombre,
      linkId: body.linkId,
      subidoPor: req.user?.id,
    });
  }

  @Get('find-by-youtube')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Buscar medio por URL de YouTube' })
  @ApiQuery({ name: 'url', required: true, type: String })
  async findByYoutubeUrl(@Query('url') url: string) {
    if (!url) throw new BadRequestException('URL requerida');
    return this.mediaService.findByYoutubeUrl(url);
  }

  @Post('download-youtube-batch')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Descargar múltiples videos de YouTube' })
  async downloadYouTubeBatch(
    @Body() body: { items: { url: string; nombre?: string; linkId?: number }[] },
    @Request() req: any,
  ) {
    if (!body.items || !Array.isArray(body.items)) {
      throw new BadRequestException('Se requiere un array de items');
    }
    return this.mediaService.downloadYouTubeBatch({
      items: body.items,
      subidoPor: req.user?.id,
    });
  }

  @Patch(':id')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Actualizar medio (nombre, tag)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { nombre?: string; tag?: string },
  ) {
    const data: { nombre?: string; tag?: TagMedia } = {};
    if (body.nombre !== undefined) data.nombre = body.nombre;
    if (body.tag && Object.values(TagMedia).includes(body.tag as TagMedia)) {
      data.tag = body.tag as TagMedia;
    }
    return this.mediaService.update(id, data);
  }

  @Post(':id/replace')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Reemplazar archivo de un medio existente' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/media',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `media-${uniqueSuffix}${ext}`);
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
        fileSize: 50 * 1024 * 1024,
      },
    }),
  )
  async replace(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    return this.mediaService.replace(id, {
      url: `/uploads/media/${file.filename}`,
      nombreOriginal: file.originalname,
      mimeType: file.mimetype,
      tamanio: file.size,
    });
  }

  @Delete('batch')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Eliminar múltiples medios y sus referencias' })
  async deleteBatch(@Body() body: { ids: number[] }) {
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      throw new BadRequestException('Se requiere un array de IDs');
    }
    return this.mediaService.deleteBatch(body.ids);
  }

  @Delete(':id')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Eliminar medio y todas sus referencias' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.mediaService.delete(id);
  }
}
