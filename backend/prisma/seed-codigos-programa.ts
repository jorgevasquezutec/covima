import { PrismaClient } from '@prisma/client';
import { customAlphabet } from 'nanoid';

const prisma = new PrismaClient();

// Alfabeto para códigos: solo mayúsculas y números, sin caracteres confusos (0/O, 1/I/L)
const CODIGO_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const generarCodigoUnico = customAlphabet(CODIGO_ALPHABET, 6);

/**
 * Genera un código único para el programa
 * Formato: INICIALESXXXXXX (ej: PMA3K9PM) - todo mayúsculas, sin guiones
 */
function generarCodigo(titulo: string): string {
  const palabras = titulo.split(/\s+/).filter(p => p.length > 0);
  let iniciales = '';

  if (palabras.length === 1) {
    iniciales = palabras[0].substring(0, 3).toUpperCase();
  } else {
    iniciales = palabras
      .slice(0, 3)
      .map(p => p.charAt(0).toUpperCase())
      .join('');
  }

  if (!iniciales || iniciales.length < 2) {
    iniciales = 'PRG';
  }

  const uniqueId = generarCodigoUnico();
  return `${iniciales}${uniqueId}`;
}

async function main() {
  console.log('🔄 Actualizando códigos de programas al nuevo formato...\n');

  // Obtener todos los programas
  const programas = await prisma.programa.findMany({
    select: {
      id: true,
      codigo: true,
      titulo: true,
    },
  });

  console.log(`📋 Encontrados ${programas.length} programas\n`);

  let actualizados = 0;
  let sinCambios = 0;

  for (const programa of programas) {
    const codigoAntiguo = programa.codigo;

    // Verificar si el código tiene el formato antiguo (con guión)
    const tieneGuion = codigoAntiguo.includes('-');

    if (tieneGuion) {
      // Generar nuevo código
      const codigoNuevo = generarCodigo(programa.titulo);

      await prisma.programa.update({
        where: { id: programa.id },
        data: { codigo: codigoNuevo },
      });

      console.log(`✅ ID ${programa.id}: ${codigoAntiguo} → ${codigoNuevo}`);
      actualizados++;
    } else {
      console.log(`⏭️  ID ${programa.id}: ${codigoAntiguo} (ya tiene formato nuevo)`);
      sinCambios++;
    }
  }

  console.log('\n========================================');
  console.log(`✅ Actualizados: ${actualizados}`);
  console.log(`⏭️  Sin cambios: ${sinCambios}`);
  console.log(`📋 Total: ${programas.length}`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
