import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Crear roles
  const roles = await Promise.all([
    prisma.rol.upsert({
      where: { nombre: 'admin' },
      update: {},
      create: {
        nombre: 'admin',
        descripcion: 'Administrador del sistema - puede todo',
      },
    }),
    prisma.rol.upsert({
      where: { nombre: 'lider' },
      update: {},
      create: {
        nombre: 'lider',
        descripcion: 'Líder JA - puede armar programas y ver reportes',
      },
    }),
    prisma.rol.upsert({
      where: { nombre: 'participante' },
      update: {},
      create: {
        nombre: 'participante',
        descripcion: 'Miembro del grupo - participa en programas',
      },
    }),
  ]);
  console.log(`Created ${roles.length} roles`);

  // Crear partes del programa
  // esObligatoria: NO se puede eliminar del programa (siempre aparece)
  // esFija: tiene un texto fijo asignado (no requiere participantes)
  // El orden sigue la estructura real del programa Maranatha:
  // NOTA: Oración Intercesora y Revivados se muestran en template pero se pueden eliminar
  const partes = [
    { nombre: 'Bienvenida', orden: 1, esFija: false, esObligatoria: true, textoFijo: null },
    { nombre: 'Oración Inicial', orden: 2, esFija: false, esObligatoria: true, textoFijo: null },
    { nombre: 'Espacio de Cantos', orden: 3, esFija: false, esObligatoria: true, textoFijo: null },
    { nombre: 'Oración Intercesora', orden: 4, esFija: false, esObligatoria: false, textoFijo: null }, // Template pero eliminable
    { nombre: 'Reavivados', orden: 5, esFija: false, esObligatoria: false, textoFijo: null }, // Template pero eliminable
    { nombre: 'Tema', orden: 6, esFija: false, esObligatoria: true, textoFijo: null },
    { nombre: 'Notijoven', orden: 7, esFija: false, esObligatoria: false, textoFijo: null },
    { nombre: 'Dinámica', orden: 8, esFija: false, esObligatoria: false, textoFijo: null },
    { nombre: 'Testimonio', orden: 9, esFija: false, esObligatoria: false, textoFijo: null },
    { nombre: 'Especial', orden: 10, esFija: false, esObligatoria: false, textoFijo: null },
    { nombre: 'Recojo de Ofrendas', orden: 11, esFija: true, esObligatoria: true, textoFijo: 'Diáconos' },
    { nombre: 'Himno Final', orden: 12, esFija: false, esObligatoria: true, textoFijo: null },
    { nombre: 'Oración Final', orden: 13, esFija: false, esObligatoria: true, textoFijo: null },
  ];

  for (const parte of partes) {
    await prisma.parte.upsert({
      where: { nombre: parte.nombre },
      update: parte,
      create: parte,
    });
  }
  console.log(`Created ${partes.length} partes`);

  // Crear usuarios
  const adminRole = roles.find((r) => r.nombre === 'admin');
  const participanteRole = roles.find((r) => r.nombre === 'participante');
  const defaultPasswordHash = await bcrypt.hash('password', 10);

  // Lista de participantes (nombre, telefono)
  const participantes = [
    { nombre: 'Damaris', telefono: '928801948' },
    { nombre: 'Elizabhet Bolaños', telefono: '962236060' },
    { nombre: 'Piedad Rivera', telefono: '957679148' },
    { nombre: 'Jean Caso', telefono: '932287482' },
    { nombre: 'Ruth Diaz', telefono: '963033161' },
    { nombre: 'Anyela Calle', telefono: '993803296' },
    { nombre: 'Bryan Chavez', telefono: '970508614' },
    { nombre: 'Pamela Maldonado', telefono: '984121155' },
    { nombre: 'Belen Diaz', telefono: '933714369' },
    { nombre: 'Renzo Higinio', telefono: '945388949' },
    { nombre: 'Liz Delgado', telefono: '949125725' },
    { nombre: 'Carla Delgado', telefono: '991157405' },
    { nombre: 'Kelly Delgado', telefono: '991018759' },
    { nombre: 'Cristhian Ramirez', telefono: '987622613' },
    { nombre: 'Jherson Flores', telefono: '994727249' },
    { nombre: 'Milca Humpiri', telefono: '966750219' },
    { nombre: 'Gina Mamani', telefono: '951212662' },
    { nombre: 'Patricia Tola', telefono: '927934296' },
    { nombre: 'Milli', telefono: '993211474' },
    { nombre: 'Irene', telefono: '951360200' },
    { nombre: 'Diego', telefono: '932722857' },
    { nombre: 'Jose Olivera', telefono: '996160566' },
    { nombre: 'Fernanda Quinto', telefono: '997170847' },
    { nombre: 'Zelo', telefono: '975662737' },
    { nombre: 'Fanny Calderon', telefono: '963895061' },
    { nombre: 'Yuxy', telefono: '966386930' },
    { nombre: 'Nicole Castro', telefono: '990134132' },
    { nombre: 'Xavier', telefono: '976203046' },
    { nombre: 'Lucia', telefono: '954764679' },
    { nombre: 'Alex', telefono: '939494403' },
    { nombre: 'Annie Chavez', telefono: '902098838' },
  ];

  // Crear usuario admin (Jorge Vasquez)
  const adminUser = await prisma.usuario.upsert({
    where: {
      codigoPais_telefono: {
        codigoPais: '51',
        telefono: '940393758',
      },
    },
    update: { nombre: 'Jorge Vasquez', passwordHash: defaultPasswordHash },
    create: {
      codigoPais: '51',
      telefono: '940393758',
      passwordHash: defaultPasswordHash,
      nombre: 'Jorge Vasquez',
      debeCambiarPassword: false,
      activo: true,
    },
  });

  // Asignar rol admin
  if (adminRole) {
    await prisma.usuarioRol.upsert({
      where: {
        usuarioId_rolId: {
          usuarioId: adminUser.id,
          rolId: adminRole.id,
        },
      },
      update: {},
      create: {
        usuarioId: adminUser.id,
        rolId: adminRole.id,
      },
    });
  }
  console.log('Created admin user: Jorge Vasquez (51-940393758)');

  // Crear participantes
  let participantesCreados = 0;
  for (const p of participantes) {
    const user = await prisma.usuario.upsert({
      where: {
        codigoPais_telefono: {
          codigoPais: '51',
          telefono: p.telefono,
        },
      },
      update: { passwordHash: defaultPasswordHash },
      create: {
        codigoPais: '51',
        telefono: p.telefono,
        passwordHash: defaultPasswordHash,
        nombre: p.nombre,
        debeCambiarPassword: true,
        activo: true,
      },
    });

    // Asignar rol participante
    if (participanteRole) {
      await prisma.usuarioRol.upsert({
        where: {
          usuarioId_rolId: {
            usuarioId: user.id,
            rolId: participanteRole.id,
          },
        },
        update: {},
        create: {
          usuarioId: user.id,
          rolId: participanteRole.id,
        },
      });
    }
    participantesCreados++;
  }

  console.log(`Created ${participantesCreados} participantes (password: password)`);

  // Crear tipos de asistencia predefinidos
  const tiposAsistencia = [
    {
      nombre: 'escuela_sabatica',
      label: 'Escuela Sabática',
      descripcion: 'Registro de asistencia a Escuela Sabática',
      icono: 'BookOpen',
      color: '#3B82F6',
      soloPresencia: false,
      orden: 1,
      campos: [
        {
          nombre: 'dias_estudio',
          label: 'Días de estudio de lección',
          tipo: 'number',
          valorMinimo: 0,
          valorMaximo: 7,
          requerido: false,
          orden: 1,
          placeholder: '¿Cuántos días estudiaste la lección?',
        },
        {
          nombre: 'estudio_biblico',
          label: '¿Hizo estudio bíblico esta semana?',
          tipo: 'checkbox',
          requerido: false,
          orden: 2,
        },
      ],
    },
    {
      nombre: 'programa_ja',
      label: 'Programa JA',
      descripcion: 'Registro de asistencia a Programa de Jóvenes Adventistas',
      icono: 'Users',
      color: '#10B981',
      soloPresencia: true,
      orden: 2,
      campos: [],
    },
    {
      nombre: 'gp',
      label: 'Grupo Pequeño',
      descripcion: 'Registro de asistencia a Grupo Pequeño',
      icono: 'Home',
      color: '#F59E0B',
      soloPresencia: true,
      orden: 3,
      campos: [],
    },
  ];

  for (const tipo of tiposAsistencia) {
    const { campos, ...tipoData } = tipo;

    const createdTipo = await prisma.tipoAsistencia.upsert({
      where: { nombre: tipo.nombre },
      update: {
        label: tipoData.label,
        descripcion: tipoData.descripcion,
        icono: tipoData.icono,
        color: tipoData.color,
        soloPresencia: tipoData.soloPresencia,
        orden: tipoData.orden,
      },
      create: tipoData,
    });

    // Crear campos del formulario si no existen
    for (const campo of campos) {
      const existingCampo = await prisma.formularioCampo.findFirst({
        where: {
          tipoAsistenciaId: createdTipo.id,
          nombre: campo.nombre,
        },
      });

      if (!existingCampo) {
        await prisma.formularioCampo.create({
          data: {
            tipoAsistenciaId: createdTipo.id,
            nombre: campo.nombre,
            label: campo.label,
            tipo: campo.tipo,
            requerido: campo.requerido,
            orden: campo.orden,
            placeholder: campo.placeholder,
            valorMinimo: campo.valorMinimo,
            valorMaximo: campo.valorMaximo,
          },
        });
      }
    }
  }
  console.log(`Created ${tiposAsistencia.length} tipos de asistencia`);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
