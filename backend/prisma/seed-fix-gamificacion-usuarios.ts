import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeder para crear perfiles de gamificación para usuarios JA activos
 * que no tienen uno creado.
 */
async function seedFixGamificacionUsuarios() {
  console.log('Buscando usuarios JA activos sin perfil de gamificación...');

  // Buscar usuarios JA activos que NO tienen perfil de gamificación
  const usuariosSinGamificacion = await prisma.usuario.findMany({
    where: {
      activo: true,
      esJA: true,
      gamificacion: null,
    },
    select: {
      id: true,
      nombre: true,
      telefono: true,
    },
  });

  console.log(`Encontrados ${usuariosSinGamificacion.length} usuarios sin perfil de gamificación`);

  if (usuariosSinGamificacion.length === 0) {
    console.log('Todos los usuarios JA activos ya tienen perfil de gamificación.');
    return;
  }

  // Obtener el nivel inicial (nivel 1)
  const nivelInicial = await prisma.nivelBiblico.findFirst({
    where: { numero: 1 },
  });

  if (!nivelInicial) {
    console.error('Error: No existe el nivel bíblico 1. Ejecuta primero seed-gamificacion.ts');
    return;
  }

  console.log('Creando perfiles de gamificación...');

  for (const usuario of usuariosSinGamificacion) {
    try {
      await prisma.usuarioGamificacion.create({
        data: {
          usuarioId: usuario.id,
          nivelId: nivelInicial.id,
          puntosTotal: 0,
          puntosTrimestre: 0,
          xpTotal: 0,
          rachaActual: 0,
          rachaMejor: 0,
          asistenciasTotales: 0,
          participacionesTotales: 0,
        },
      });
      console.log(`  ✓ Creado perfil para: ${usuario.nombre} (ID: ${usuario.id}, Tel: ${usuario.telefono})`);
    } catch (error) {
      console.error(`  ✗ Error creando perfil para ${usuario.nombre}: ${error}`);
    }
  }

  console.log('\nSeeder completado!');

  // Verificar el resultado
  const totalConGamificacion = await prisma.usuario.count({
    where: {
      activo: true,
      esJA: true,
      gamificacion: { isNot: null },
    },
  });

  const totalJAActivos = await prisma.usuario.count({
    where: {
      activo: true,
      esJA: true,
    },
  });

  console.log(`\nResumen:`);
  console.log(`  - Total usuarios JA activos: ${totalJAActivos}`);
  console.log(`  - Con perfil de gamificación: ${totalConGamificacion}`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedFixGamificacionUsuarios()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedFixGamificacionUsuarios };
