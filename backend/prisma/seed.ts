import { PrismaClient, CategoriaAccion, TipoGrupoRanking, CriterioMembresia } from '@prisma/client';
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
  // puntos: puntos por participar en esta parte
  // xp: experiencia por participar en esta parte
  const partes = [
    { nombre: 'Bienvenida', orden: 1, esFija: false, esObligatoria: true, textoFijo: null, puntos: 10, xp: 15 }, // Dirección
    { nombre: 'Oración Inicial', orden: 2, esFija: false, esObligatoria: true, textoFijo: null, puntos: 4, xp: 6 },
    { nombre: 'Espacio de Cantos', orden: 3, esFija: false, esObligatoria: true, textoFijo: null, puntos: 5, xp: 8 },
    { nombre: 'Oración Intercesora', orden: 4, esFija: false, esObligatoria: false, textoFijo: null, puntos: 4, xp: 6 },
    { nombre: 'Reavivados', orden: 5, esFija: false, esObligatoria: false, textoFijo: null, puntos: 5, xp: 8 },
    { nombre: 'Tema', orden: 6, esFija: false, esObligatoria: true, textoFijo: null, puntos: 8, xp: 12 }, // Tema Central
    { nombre: 'Notijoven', orden: 7, esFija: false, esObligatoria: false, textoFijo: null, puntos: 4, xp: 6 },
    { nombre: 'Dinámica', orden: 8, esFija: false, esObligatoria: false, textoFijo: null, puntos: 5, xp: 8 },
    { nombre: 'Testimonio', orden: 9, esFija: false, esObligatoria: false, textoFijo: null, puntos: 5, xp: 8 },
    { nombre: 'Especial', orden: 10, esFija: false, esObligatoria: false, textoFijo: null, puntos: 6, xp: 10 }, // Especial Musical
    { nombre: 'Recojo de Ofrendas', orden: 11, esFija: true, esObligatoria: true, textoFijo: 'Diáconos', puntos: 0, xp: 0 },
    { nombre: 'Himno Final', orden: 12, esFija: false, esObligatoria: true, textoFijo: null, puntos: 3, xp: 5 },
    { nombre: 'Oración Final', orden: 13, esFija: false, esObligatoria: true, textoFijo: null, puntos: 4, xp: 6 },
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

  // ==================== GAMIFICACIÓN ====================

  // Niveles Bíblicos
  const niveles = [
    { numero: 1, nombre: 'Discípulo', xpRequerido: 0, icono: '📖', color: '#9CA3AF' },
    { numero: 2, nombre: 'Creyente', xpRequerido: 100, icono: '🙏', color: '#60A5FA' },
    { numero: 3, nombre: 'Adorador', xpRequerido: 300, icono: '🎵', color: '#34D399' },
    { numero: 4, nombre: 'Testigo', xpRequerido: 600, icono: '🌟', color: '#FBBF24' },
    { numero: 5, nombre: 'Siervo', xpRequerido: 1000, icono: '🤲', color: '#F87171' },
    { numero: 6, nombre: 'Líder', xpRequerido: 1500, icono: '🦁', color: '#A78BFA' },
    { numero: 7, nombre: 'Pastor', xpRequerido: 2200, icono: '🐑', color: '#FB923C' },
    { numero: 8, nombre: 'Profeta', xpRequerido: 3000, icono: '🔥', color: '#EC4899' },
    { numero: 9, nombre: 'Apóstol', xpRequerido: 4000, icono: '⚡', color: '#8B5CF6' },
    { numero: 10, nombre: 'Serafín', xpRequerido: 5500, icono: '👼', color: '#FACC15' },
  ];

  for (const nivel of niveles) {
    await prisma.nivelBiblico.upsert({
      where: { numero: nivel.numero },
      update: nivel,
      create: nivel,
    });
  }
  console.log(`Created ${niveles.length} niveles bíblicos`);

  // Configuración de Puntajes
  const puntajes = [
    // Asistencia
    { codigo: 'asistencia_temprana', nombre: 'Asistencia Temprana', categoria: CategoriaAccion.ASISTENCIA, puntos: 5, xp: 8 },
    { codigo: 'asistencia_normal', nombre: 'Asistencia Normal', categoria: CategoriaAccion.ASISTENCIA, puntos: 3, xp: 5 },
    { codigo: 'asistencia_tardia', nombre: 'Asistencia Tardía', categoria: CategoriaAccion.ASISTENCIA, puntos: 1, xp: 2 },
    // Rachas
    { codigo: 'racha_4_semanas', nombre: 'Racha 4 semanas', categoria: CategoriaAccion.BONUS, puntos: 10, xp: 15 },
    { codigo: 'racha_8_semanas', nombre: 'Racha 8 semanas', categoria: CategoriaAccion.BONUS, puntos: 20, xp: 30 },
    { codigo: 'racha_12_semanas', nombre: 'Racha 12 semanas', categoria: CategoriaAccion.BONUS, puntos: 50, xp: 75 },
  ];

  for (const puntaje of puntajes) {
    await prisma.configuracionPuntaje.upsert({
      where: { codigo: puntaje.codigo },
      update: {
        nombre: puntaje.nombre,
        categoria: puntaje.categoria,
        puntos: puntaje.puntos,
        xp: puntaje.xp,
      },
      create: {
        codigo: puntaje.codigo,
        nombre: puntaje.nombre,
        descripcion: puntaje.nombre,
        categoria: puntaje.categoria,
        puntos: puntaje.puntos,
        xp: puntaje.xp,
      },
    });
  }
  console.log(`Created ${puntajes.length} configuraciones de puntaje`);

  // Insignias
  const insignias = [
    { codigo: 'madrugador', nombre: 'Madrugador', descripcion: '10 asistencias tempranas', icono: '🌅', condicionTipo: 'asistencias_tempranas', condicionValor: 10, puntosBonus: 10, xpBonus: 15 },
    { codigo: 'constante', nombre: 'Constante', descripcion: 'Racha de 4 semanas', icono: '🔥', condicionTipo: 'racha_semanas', condicionValor: 4, puntosBonus: 15, xpBonus: 20 },
    { codigo: 'fiel', nombre: 'Fiel', descripcion: 'Racha de 12 semanas', icono: '💎', condicionTipo: 'racha_semanas', condicionValor: 12, puntosBonus: 50, xpBonus: 75 },
    { codigo: 'veterano', nombre: 'Veterano', descripcion: '50 asistencias totales', icono: '🎖️', condicionTipo: 'asistencias_totales', condicionValor: 50, puntosBonus: 30, xpBonus: 50 },
    { codigo: 'orador', nombre: 'Orador', descripcion: '5 temas centrales', icono: '🎤', condicionTipo: 'temas_centrales', condicionValor: 5, puntosBonus: 20, xpBonus: 30 },
    { codigo: 'director', nombre: 'Director', descripcion: '10 direcciones de programa', icono: '🎬', condicionTipo: 'direcciones', condicionValor: 10, puntosBonus: 25, xpBonus: 40 },
  ];

  for (const insignia of insignias) {
    await prisma.insignia.upsert({
      where: { codigo: insignia.codigo },
      update: insignia,
      create: insignia,
    });
  }
  console.log(`Created ${insignias.length} insignias`);

  // Eventos Especiales
  const eventos = [
    { codigo: 'd13', nombre: 'Día 13', descripcion: 'Evangelismo día 13', puntos: 15, xp: 20, icono: '📢', color: '#EF4444' },
    { codigo: 'reavivados', nombre: 'Reavivados', descripcion: 'Campaña Reavivados', puntos: 10, xp: 15, icono: '🔥', color: '#F97316' },
    { codigo: 'semana_santa', nombre: 'Semana Santa', descripcion: 'Actividades de Semana Santa', puntos: 20, xp: 30, icono: '✝️', color: '#8B5CF6' },
    { codigo: 'campamento', nombre: 'Campamento', descripcion: 'Campamento JA', puntos: 30, xp: 50, icono: '⛺', color: '#22C55E' },
  ];

  for (const evento of eventos) {
    await prisma.eventoEspecialConfig.upsert({
      where: { codigo: evento.codigo },
      update: evento,
      create: evento,
    });
  }
  console.log(`Created ${eventos.length} eventos especiales`);

  // Período de Ranking activo
  const periodo = await prisma.periodoRanking.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre: 'Q1 2026',
      descripcion: 'Primer trimestre 2026 (Enero - Marzo)',
      fechaInicio: new Date('2026-01-01'),
      fechaFin: new Date('2026-03-31'),
      estado: 'ACTIVO',
      creadoPorId: adminUser.id,
    },
  });
  console.log(`Created período de ranking: ${periodo.nombre}`);

  // Grupos de Ranking del Sistema
  const gruposRanking = [
    {
      codigo: 'general',
      nombre: 'Ranking General',
      descripcion: 'Ranking de todos los miembros activos (sin líderes/admin)',
      icono: '🏆',
      color: '#FACC15',
      tipo: TipoGrupoRanking.SISTEMA,
      criterio: CriterioMembresia.TODOS_ACTIVOS,
      esPublico: true,
      orden: 1,
    },
    {
      codigo: 'lideres',
      nombre: 'Ranking Líderes',
      descripcion: 'Ranking exclusivo de líderes y administradores',
      icono: '👑',
      color: '#8B5CF6',
      tipo: TipoGrupoRanking.SISTEMA,
      criterio: CriterioMembresia.ROL_LIDER_ADMIN,
      esPublico: true,
      orden: 2,
    },
  ];

  for (const grupo of gruposRanking) {
    await prisma.grupoRanking.upsert({
      where: { codigo: grupo.codigo },
      update: {
        nombre: grupo.nombre,
        descripcion: grupo.descripcion,
        icono: grupo.icono,
        color: grupo.color,
        tipo: grupo.tipo,
        criterio: grupo.criterio,
        esPublico: grupo.esPublico,
        orden: grupo.orden,
      },
      create: {
        codigo: grupo.codigo,
        nombre: grupo.nombre,
        descripcion: grupo.descripcion,
        icono: grupo.icono,
        color: grupo.color,
        tipo: grupo.tipo,
        criterio: grupo.criterio,
        esPublico: grupo.esPublico,
        orden: grupo.orden,
        creadoPorId: adminUser.id,
      },
    });
  }
  console.log(`Created ${gruposRanking.length} grupos de ranking del sistema`);

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
