import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TagMedia } from '@prisma/client';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { stat, access } from 'fs/promises';
import { join } from 'path';

const execFileAsync = promisify(execFile);

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    tag?: TagMedia;
  }) {
    const { page = 1, limit = 20, search, tag } = options || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { nombreOriginal: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tag) {
      where.tag = tag;
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

  /** Auto-detect tag from mimeType and name */
  detectTag(mimeType: string, nombre?: string): TagMedia {
    const nameLower = (nombre || '').toLowerCase();
    if (
      nameLower.includes('himno') ||
      nameLower.includes('adventista') ||
      nameLower.includes('hymn')
    ) {
      return TagMedia.HIMNO;
    }
    if (mimeType.startsWith('image/')) return TagMedia.IMAGEN;
    if (mimeType.startsWith('video/')) return TagMedia.VIDEO;
    return TagMedia.OTRO;
  }

  async create(data: {
    url: string;
    nombre?: string;
    nombreOriginal?: string;
    mimeType: string;
    tamanio: number;
    subidoPor?: number;
    tag?: TagMedia;
    youtubeUrl?: string;
  }) {
    const tag = data.tag || this.detectTag(data.mimeType, data.nombre);
    return this.prisma.mediaItem.create({
      data: {
        url: data.url,
        nombre: data.nombre,
        nombreOriginal: data.nombreOriginal,
        mimeType: data.mimeType,
        tamanio: data.tamanio,
        subidoPor: data.subidoPor,
        tag,
        youtubeUrl: data.youtubeUrl,
      },
    });
  }

  async update(id: number, data: { nombre?: string; tag?: TagMedia }) {
    const item = await this.prisma.mediaItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('MediaItem no encontrado');
    }
    const updateData: any = {};
    if (data.nombre !== undefined) updateData.nombre = data.nombre;
    if (data.tag !== undefined) updateData.tag = data.tag;
    return this.prisma.mediaItem.update({
      where: { id },
      data: updateData,
    });
  }

  /** Normalize a YouTube URL to a canonical form for matching */
  private normalizeYouTubeUrl(url: string): string | null {
    try {
      const u = new URL(url);
      let videoId: string | null = null;
      if (u.hostname === 'youtu.be') {
        videoId = u.pathname.slice(1);
      } else if (u.hostname.includes('youtube.com')) {
        videoId = u.searchParams.get('v');
      }
      return videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
    } catch {
      return null;
    }
  }

  async findByYoutubeUrl(url: string) {
    const normalized = this.normalizeYouTubeUrl(url);
    if (!normalized) return null;

    // Manual match since we need to normalize both sides
    const items = await this.prisma.mediaItem.findMany({
      where: { youtubeUrl: { not: null } },
      orderBy: { createdAt: 'desc' },
    });

    for (const item of items) {
      if (item.youtubeUrl && this.normalizeYouTubeUrl(item.youtubeUrl) === normalized) {
        return item;
      }
    }
    return null;
  }

  async downloadYouTubeBatch(data: {
    items: { url: string; nombre?: string; linkId?: number }[];
    subidoPor?: number;
  }) {
    const CONCURRENCY = 3;
    const results: { url: string; mediaItem?: any; skipped?: boolean; error?: string }[] =
      new Array(data.items.length);

    // Separate skip-able items from items that need downloading
    const toDownload: { item: typeof data.items[0]; index: number }[] = [];

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      try {
        const existing = await this.findByYoutubeUrl(item.url);
        if (existing) {
          if (item.linkId) {
            await this.prisma.programaLink.update({
              where: { id: item.linkId },
              data: { mediaItemId: existing.id },
            }).catch(() => {});
          }
          results[i] = { url: item.url, mediaItem: existing, skipped: true };
          continue;
        }
      } catch {
        // If lookup fails, try downloading anyway
      }
      toDownload.push({ item, index: i });
    }

    // Download in parallel with concurrency limit
    const processItem = async (entry: typeof toDownload[0]) => {
      try {
        const mediaItem = await this.downloadYouTube({
          url: entry.item.url,
          nombre: entry.item.nombre,
          linkId: entry.item.linkId,
          subidoPor: data.subidoPor,
        });
        results[entry.index] = { url: entry.item.url, mediaItem };
      } catch (error: any) {
        this.logger.error(`Batch download failed for ${entry.item.url}: ${error.message}`);
        results[entry.index] = { url: entry.item.url, error: error.message || 'Error desconocido' };
      }
    };

    // Simple concurrency pool
    let cursor = 0;
    const runNext = async (): Promise<void> => {
      const idx = cursor++;
      if (idx >= toDownload.length) return;
      await processItem(toDownload[idx]);
      return runNext();
    };

    const workers = Array.from(
      { length: Math.min(CONCURRENCY, toDownload.length) },
      () => runNext(),
    );
    await Promise.all(workers);

    return results;
  }

  async delete(id: number) {
    const item = await this.prisma.mediaItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('MediaItem no encontrado');
    }

    // Eliminar todas las referencias ProgramaFoto y luego el MediaItem
    await this.prisma.$transaction([
      this.prisma.programaFoto.deleteMany({ where: { mediaItemId: id } }),
      this.prisma.programaLink.updateMany({
        where: { mediaItemId: id },
        data: { mediaItemId: null },
      }),
      this.prisma.mediaItem.delete({ where: { id } }),
    ]);

    return { deleted: true };
  }

  async deleteBatch(ids: number[]) {
    if (!ids.length) return { deleted: 0 };

    const items = await this.prisma.mediaItem.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const foundIds = items.map((i) => i.id);

    if (!foundIds.length) return { deleted: 0 };

    await this.prisma.$transaction([
      this.prisma.programaFoto.deleteMany({
        where: { mediaItemId: { in: foundIds } },
      }),
      this.prisma.programaLink.updateMany({
        where: { mediaItemId: { in: foundIds } },
        data: { mediaItemId: null },
      }),
      this.prisma.mediaItem.deleteMany({
        where: { id: { in: foundIds } },
      }),
    ]);

    return { deleted: foundIds.length };
  }

  async replace(
    id: number,
    data: {
      url: string;
      nombreOriginal?: string;
      mimeType: string;
      tamanio: number;
    },
  ) {
    const item = await this.prisma.mediaItem.findUnique({
      where: { id },
      include: { _count: { select: { programaFotos: true } } },
    });
    if (!item) {
      throw new NotFoundException('MediaItem no encontrado');
    }

    // Actualizar el MediaItem con la nueva URL/archivo
    const updated = await this.prisma.mediaItem.update({
      where: { id },
      data: {
        url: data.url,
        nombreOriginal: data.nombreOriginal,
        mimeType: data.mimeType,
        tamanio: data.tamanio,
      },
      include: { _count: { select: { programaFotos: true } } },
    });

    // Actualizar la URL en todas las ProgramaFoto que referencian este MediaItem
    await this.prisma.programaFoto.updateMany({
      where: { mediaItemId: id },
      data: { url: data.url },
    });

    return updated;
  }

  /**
   * Download a YouTube video using yt-dlp and save it as a MediaItem.
   */
  async downloadYouTube(data: {
    url: string;
    nombre?: string;
    linkId?: number;
    subidoPor?: number;
  }) {
    const { url, linkId, subidoPor } = data;

    // Validate URL
    try {
      const u = new URL(url);
      if (
        !u.hostname.includes('youtube.com') &&
        u.hostname !== 'youtu.be'
      ) {
        throw new Error();
      }
    } catch {
      throw new BadRequestException('URL de YouTube no válida');
    }

    // Build yt-dlp args: usar cookies del navegador local, o archivo cookies.txt como fallback
    const cookiesPath = join(process.cwd(), 'cookies.txt');
    const ytDlpArgs: string[] = [];

    try {
      await access(cookiesPath);
      ytDlpArgs.push('--cookies', cookiesPath);
    } catch {
      // Sin archivo de cookies, intentar con el navegador Chrome local
      ytDlpArgs.push('--cookies-from-browser', 'chrome');
    }

    // Get video title if no name provided
    let nombre = data.nombre;
    if (!nombre) {
      try {
        const { stdout } = await execFileAsync('yt-dlp', [
          ...ytDlpArgs,
          '--print', 'title',
          url,
        ], { timeout: 30000 });
        nombre = stdout.trim();
      } catch {
        nombre = 'Video YouTube';
      }
    }

    // Generate output filename
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const filename = `media-${timestamp}-${random}.mp4`;
    const outputPath = join(process.cwd(), 'uploads', 'media', filename);

    // Download video
    this.logger.log(`Downloading YouTube video: ${url} -> ${outputPath}`);
    try {
      await execFileAsync(
        'yt-dlp',
        [
          ...ytDlpArgs,
          '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
          '--merge-output-format', 'mp4',
          '--no-playlist',
          '-o', outputPath,
          url,
        ],
        { timeout: 300000 },
      );
    } catch (error: any) {
      this.logger.error(`yt-dlp failed: ${error.message}`);
      throw new BadRequestException(
        `Error al descargar el video: ${error.stderr || error.message}`,
      );
    }

    // Get file size
    let tamanio = 0;
    try {
      const stats = await stat(outputPath);
      tamanio = stats.size;
    } catch {
      // continue with 0
    }

    // Auto-tag
    const tag = this.detectTag('video/mp4', nombre);

    // Create MediaItem
    const mediaItem = await this.prisma.mediaItem.create({
      data: {
        url: `/uploads/media/${filename}`,
        nombre,
        mimeType: 'video/mp4',
        tamanio,
        tag,
        youtubeUrl: url,
        subidoPor,
      },
    });

    // If linkId provided, update the ProgramaLink
    if (linkId) {
      await this.prisma.programaLink.update({
        where: { id: linkId },
        data: { mediaItemId: mediaItem.id },
      }).catch(() => {
        // Link may not exist, ignore
      });
    }

    this.logger.log(
      `YouTube download complete: ${nombre} (${(tamanio / 1024 / 1024).toFixed(1)} MB)`,
    );

    return mediaItem;
  }
}
