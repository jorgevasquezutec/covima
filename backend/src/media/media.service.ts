import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  async findAll(options?: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 20, search } = options || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { nombreOriginal: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.mediaItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { programaFotos: true } },
        },
      }),
      this.prisma.mediaItem.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(data: {
    url: string;
    nombre?: string;
    nombreOriginal?: string;
    mimeType: string;
    tamanio: number;
    subidoPor?: number;
  }) {
    return this.prisma.mediaItem.create({ data });
  }

  async updateNombre(id: number, nombre: string) {
    const item = await this.prisma.mediaItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('MediaItem no encontrado');
    }
    return this.prisma.mediaItem.update({
      where: { id },
      data: { nombre },
    });
  }

  async delete(id: number) {
    const item = await this.prisma.mediaItem.findUnique({
      where: { id },
      include: { _count: { select: { programaFotos: true } } },
    });
    if (!item) {
      throw new NotFoundException('MediaItem no encontrado');
    }
    if (item._count.programaFotos > 0) {
      throw new BadRequestException(
        `No se puede eliminar: está referenciado por ${item._count.programaFotos} foto(s) de programa`,
      );
    }
    return this.prisma.mediaItem.delete({ where: { id } });
  }
}
