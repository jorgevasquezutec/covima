/**
 * Seeder: Migrar códigos QR de asistencia al nuevo formato
 *
 * Formato antiguo: JA-XXXXXXXX (con guión)
 * Formato nuevo: JAXXXXXXXX (sin guión)
 *
 * Uso: npx ts-node --transpile-only prisma/seed-qr-codes-migration.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Migración de códigos QR de asistencia ===\n');

  // Buscar todos los QR con formato antiguo (con guión)
  const qrsConGuion = await prisma.qRAsistencia.findMany({
    where: {
      codigo: {
        contains: '-',
      },
    },
  });

  console.log(`Encontrados ${qrsConGuion.length} códigos QR con guión\n`);

  if (qrsConGuion.length === 0) {
    console.log('No hay códigos para migrar. ¡Todo actualizado!');
    return;
  }

  let migrados = 0;
  let errores = 0;

  for (const qr of qrsConGuion) {
    const codigoAntiguo = qr.codigo;
    const codigoNuevo = codigoAntiguo.replace('-', '');

    try {
      // Verificar que el nuevo código no exista
      const existente = await prisma.qRAsistencia.findUnique({
        where: { codigo: codigoNuevo },
      });

      if (existente) {
        console.log(`⚠️  ${codigoAntiguo} → ${codigoNuevo} (ya existe, omitiendo)`);
        continue;
      }

      // Actualizar el código
      await prisma.qRAsistencia.update({
        where: { id: qr.id },
        data: { codigo: codigoNuevo },
      });

      console.log(`✅ ${codigoAntiguo} → ${codigoNuevo}`);
      migrados++;
    } catch (error) {
      console.log(`❌ ${codigoAntiguo} → Error: ${error.message}`);
      errores++;
    }
  }

  console.log('\n=== Resumen ===');
  console.log(`Total encontrados: ${qrsConGuion.length}`);
  console.log(`Migrados: ${migrados}`);
  console.log(`Errores: ${errores}`);
}

main()
  .catch((e) => {
    console.error('Error en la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
