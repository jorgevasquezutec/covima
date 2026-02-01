import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCursosBiblicos() {
  console.log('Seeding cursos bíblicos...');

  const cursos = [
    {
      nombre: 'La fe de Jesús',
      descripcion: 'Curso básico de doctrina cristiana adventista',
      totalLecciones: 20,
      orden: 1,
    },
    {
      nombre: 'El Gran Conflicto',
      descripcion: 'Estudio del conflicto entre el bien y el mal',
      totalLecciones: 20,
      orden: 2,
    },
    {
      nombre: 'Yo Creo',
      descripcion: 'Fundamentos de la fe cristiana',
      totalLecciones: 20,
      orden: 3,
    },
    {
      nombre: 'Escuchando la voz de Dios',
      descripcion: 'Aprendiendo a discernir la voluntad divina',
      totalLecciones: 20,
      orden: 4,
    },
  ];

  for (const curso of cursos) {
    await prisma.cursoBiblico.upsert({
      where: { nombre: curso.nombre },
      update: {
        descripcion: curso.descripcion,
        totalLecciones: curso.totalLecciones,
        orden: curso.orden,
      },
      create: curso,
    });
    console.log(`  ✓ Curso "${curso.nombre}" creado/actualizado`);
  }

  console.log('Seed de cursos bíblicos completado!');
}

seedCursosBiblicos()
  .catch((e) => {
    console.error('Error en seed de cursos bíblicos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
