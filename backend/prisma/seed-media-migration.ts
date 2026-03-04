import { PrismaClient } from '@prisma/client';
import { extname } from 'path';

const prisma = new PrismaClient();

/**
 * Migration script: creates MediaItem records for existing ProgramaFoto URLs
 * and links them via mediaItemId.
 *
 * Safe to run multiple times — skips ProgramaFotos that already have a mediaItemId.
 */
async function main() {
  console.log('Starting media migration...');

  // Get all ProgramaFoto records that don't have a mediaItemId yet
  const fotos = await prisma.programaFoto.findMany({
    where: { mediaItemId: null },
    orderBy: { id: 'asc' },
  });

  if (fotos.length === 0) {
    console.log('No ProgramaFoto records need migration.');
    return;
  }

  console.log(`Found ${fotos.length} ProgramaFoto records without mediaItemId`);

  // Group by unique URL to avoid duplicates
  const urlMap = new Map<string, typeof fotos>();
  for (const foto of fotos) {
    if (!urlMap.has(foto.url)) {
      urlMap.set(foto.url, []);
    }
    urlMap.get(foto.url)!.push(foto);
  }

  console.log(`${urlMap.size} unique URLs to process`);

  let created = 0;
  let linked = 0;

  for (const [url, fotosWithUrl] of urlMap) {
    // Check if a MediaItem already exists for this URL
    let mediaItem = await prisma.mediaItem.findFirst({
      where: { url },
    });

    if (!mediaItem) {
      // Guess mime type from extension
      const ext = extname(url).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime',
      };

      mediaItem = await prisma.mediaItem.create({
        data: {
          url,
          mimeType: mimeTypes[ext] || 'application/octet-stream',
          nombre: fotosWithUrl[0].nombre || undefined,
          subidoPor: fotosWithUrl[0].agregadoPor || undefined,
        },
      });
      created++;
    }

    // Link all ProgramaFoto records with this URL to the MediaItem
    for (const foto of fotosWithUrl) {
      await prisma.programaFoto.update({
        where: { id: foto.id },
        data: { mediaItemId: mediaItem.id },
      });
      linked++;
    }
  }

  console.log(`Migration complete: ${created} MediaItems created, ${linked} ProgramaFotos linked`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
