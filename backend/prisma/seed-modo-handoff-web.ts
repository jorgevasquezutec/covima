import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeder para cambiar el modo de respuesta por defecto de todos los usuarios a WEB
 */
async function seedModoHandoffWeb() {
  console.log('Actualizando modo de respuesta por defecto a WEB...');

  // Contar usuarios con AMBOS
  const countAmbos = await prisma.usuario.count({
    where: { modoHandoffDefault: 'AMBOS' },
  });

  console.log(`Usuarios con modo AMBOS: ${countAmbos}`);

  if (countAmbos === 0) {
    console.log('No hay usuarios que actualizar.');
    return;
  }

  // Actualizar todos los usuarios que tienen AMBOS a WEB
  const result = await prisma.usuario.updateMany({
    where: { modoHandoffDefault: 'AMBOS' },
    data: { modoHandoffDefault: 'WEB' },
  });

  console.log(`✓ ${result.count} usuarios actualizados a modo WEB`);

  // Verificar
  const countWeb = await prisma.usuario.count({
    where: { modoHandoffDefault: 'WEB' },
  });

  console.log(`\nResumen:`);
  console.log(`  - Usuarios con modo WEB: ${countWeb}`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedModoHandoffWeb()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedModoHandoffWeb };
