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
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.mediaService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
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
    });

    return mediaItem;
  }

  @Patch(':id')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Renombrar medio' })
  async updateNombre(
    @Param('id', ParseIntPipe) id: number,
    @Body('nombre') nombre: string,
  ) {
    return this.mediaService.updateNombre(id, nombre);
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

  @Delete(':id')
  @Roles('admin', 'lider')
  @ApiOperation({ summary: 'Eliminar medio y todas sus referencias' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.mediaService.delete(id);
  }
}
