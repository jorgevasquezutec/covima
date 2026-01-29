import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🎂 Aplicando correcciones de cumpleaños...\n');

  const defaultPasswordHash = await bcrypt.hash('password', 10);

  // 1. Actualizar Jorge Vasquez cumpleaños (15/06)
  console.log('1. Actualizando Jorge Vasquez (15/6)...');
  await prisma.usuario.update({
    where: { codigoPais_telefono: { codigoPais: '51', telefono: '940393758' } },
    data: {
      fechaNacimiento: new Date(2000, 5, 15), // 15 de junio
    },
  });
  console.log('   ✅ Jorge Vasquez actualizado');

  // 2. Actualizar Diego a "Diego Orduña Moreno" y su cumpleaños
  console.log('2. Actualizando Diego → Diego Orduña Moreno (29/6)...');
  await prisma.usuario.update({
    where: { codigoPais_telefono: { codigoPais: '51', telefono: '932722857' } },
    data: {
      nombre: 'Diego Orduña Moreno',
      fechaNacimiento: new Date(2000, 5, 29), // 29 de junio
    },
  });
  console.log('   ✅ Diego actualizado');

  // 3. Actualizar Zelo con su cumpleaños
  console.log('3. Actualizando Zelo (18/4)...');
  await prisma.usuario.update({
    where: { codigoPais_telefono: { codigoPais: '51', telefono: '975662737' } },
    data: {
      fechaNacimiento: new Date(2000, 3, 18), // 18 de abril
    },
  });
  console.log('   ✅ Zelo actualizado');

  // 4. Actualizar Annie Chavez (Grethel) con su cumpleaños
  console.log('4. Actualizando Annie Chavez (16/4)...');
  await prisma.usuario.update({
    where: { codigoPais_telefono: { codigoPais: '51', telefono: '902098838' } },
    data: {
      fechaNacimiento: new Date(2000, 3, 16), // 16 de abril
    },
  });
  console.log('   ✅ Annie Chavez actualizada');

  // 5. Crear Jhefren Espino Roman
  console.log('5. Creando Jhefren Espino Roman (6/10)...');
  const jhefren = await prisma.usuario.upsert({
    where: { codigoPais_telefono: { codigoPais: '51', telefono: '978612876' } },
    update: {
      nombre: 'Jhefren Espino Roman',
      fechaNacimiento: new Date(2000, 9, 6), // 6 de octubre
    },
    create: {
      codigoPais: '51',
      telefono: '978612876',
      passwordHash: defaultPasswordHash,
      nombre: 'Jhefren Espino Roman',
      fechaNacimiento: new Date(2000, 9, 6),
      debeCambiarPassword: true,
      activo: true,
    },
  });
  // Asignar rol participante
  const participanteRole = await prisma.rol.findUnique({ where: { nombre: 'participante' } });
  if (participanteRole) {
    await prisma.usuarioRol.upsert({
      where: { usuarioId_rolId: { usuarioId: jhefren.id, rolId: participanteRole.id } },
      update: {},
      create: { usuarioId: jhefren.id, rolId: participanteRole.id },
    });
  }
  console.log('   ✅ Jhefren creado');

  // 6. Crear Dany Quezada
  console.log('6. Creando Dany Quezada (30/12)...');
  const dany = await prisma.usuario.upsert({
    where: { codigoPais_telefono: { codigoPais: '51', telefono: '965045963' } },
    update: {
      nombre: 'Dany Quezada',
      fechaNacimiento: new Date(2000, 11, 30), // 30 de diciembre
    },
    create: {
      codigoPais: '51',
      telefono: '965045963',
      passwordHash: defaultPasswordHash,
      nombre: 'Dany Quezada',
      fechaNacimiento: new Date(2000, 11, 30),
      debeCambiarPassword: true,
      activo: true,
    },
  });
  if (participanteRole) {
    await prisma.usuarioRol.upsert({
      where: { usuarioId_rolId: { usuarioId: dany.id, rolId: participanteRole.id } },
      update: {},
      create: { usuarioId: dany.id, rolId: participanteRole.id },
    });
  }
  console.log('   ✅ Dany creado');

  // 7. Crear Antonio Peña
  console.log('7. Creando Antonio Peña (20/11)...');
  const antonio = await prisma.usuario.upsert({
    where: { codigoPais_telefono: { codigoPais: '51', telefono: '902318278' } },
    update: {
      nombre: 'Antonio Peña',
      fechaNacimiento: new Date(2000, 10, 20), // 20 de noviembre
    },
    create: {
      codigoPais: '51',
      telefono: '902318278',
      passwordHash: defaultPasswordHash,
      nombre: 'Antonio Peña',
      fechaNacimiento: new Date(2000, 10, 20),
      debeCambiarPassword: true,
      activo: true,
    },
  });
  if (participanteRole) {
    await prisma.usuarioRol.upsert({
      where: { usuarioId_rolId: { usuarioId: antonio.id, rolId: participanteRole.id } },
      update: {},
      create: { usuarioId: antonio.id, rolId: participanteRole.id },
    });
  }
  console.log('   ✅ Antonio creado');

  console.log('\n✅ ¡Todas las correcciones aplicadas!');
  console.log('\n⚠️  Pendientes (sin teléfono):');
  console.log('   - Diego Bondera (4/4)');
  console.log('   - Gabriel Salomé (19/1)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
