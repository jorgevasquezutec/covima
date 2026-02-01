import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPlantillas() {
  console.log('Seeding plantillas de programa...');

  // ==================== PLANTILLA JA ESTÁNDAR ====================
  const plantillaJA = await prisma.plantillaPrograma.upsert({
    where: { id: 1 },
    update: {
      nombre: 'Programa JA Estándar',
      descripcion: 'Estructura típica de un programa de Jóvenes Adventistas',
      activo: true,
      esDefault: true,
      orden: 1,
    },
    create: {
      nombre: 'Programa JA Estándar',
      descripcion: 'Estructura típica de un programa de Jóvenes Adventistas',
      activo: true,
      esDefault: true,
      orden: 1,
    },
  });
  console.log(`Plantilla "${plantillaJA.nombre}" creada/actualizada`);

  // Partes en orden para JA Estándar
  const partesJA = [
    'Bienvenida',
    'Oración Inicial',
    'Espacio de Cantos',
    'Oración Intercesora',
    'Reavivados',
    'Tema',
    'Recojo de Ofrendas',
    'Himno Final',
    'Oración Final',
  ];

  // Eliminar partes existentes de esta plantilla
  await prisma.plantillaParte.deleteMany({
    where: { plantillaId: plantillaJA.id },
  });

  // Buscar IDs de las partes y crear las relaciones
  let ordenJA = 1;
  for (const nombreParte of partesJA) {
    const parte = await prisma.parte.findFirst({
      where: {
        OR: [
          { nombre: nombreParte },
          { nombre: { contains: nombreParte, mode: 'insensitive' } },
        ],
      },
    });

    if (parte) {
      await prisma.plantillaParte.create({
        data: {
          plantillaId: plantillaJA.id,
          parteId: parte.id,
          orden: ordenJA++,
        },
      });
      console.log(`  - Parte "${parte.nombre}" agregada (orden ${ordenJA - 1})`);
    } else {
      console.warn(`  ⚠️ Parte "${nombreParte}" no encontrada en BD`);
    }
  }

  // ==================== PLANTILLA VACÍA ====================
  const plantillaVacia = await prisma.plantillaPrograma.upsert({
    where: { id: 2 },
    update: {
      nombre: 'Programa Vacío',
      descripcion: 'Empezar desde cero y agregar partes manualmente',
      activo: true,
      esDefault: false,
      orden: 99,
    },
    create: {
      nombre: 'Programa Vacío',
      descripcion: 'Empezar desde cero y agregar partes manualmente',
      activo: true,
      esDefault: false,
      orden: 99,
    },
  });
  console.log(`Plantilla "${plantillaVacia.nombre}" creada/actualizada`);

  // La plantilla vacía no tiene partes
  await prisma.plantillaParte.deleteMany({
    where: { plantillaId: plantillaVacia.id },
  });

  console.log('Seed de plantillas completado!');
}

seedPlantillas()
  .catch((e) => {
    console.error('Error en seed de plantillas:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
