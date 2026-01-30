import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAsistenciasPuntos() {
  console.log('=== Seeding puntos para asistencias confirmadas ===\n');

  // 1. Obtener período activo (o el primero disponible)
  let periodoActivo = await prisma.periodoRanking.findFirst({
    where: { estado: 'ACTIVO' },
  });

  if (!periodoActivo) {
    periodoActivo = await prisma.periodoRanking.findFirst({
      orderBy: { fechaInicio: 'desc' },
    });
  }

  if (!periodoActivo) {
    console.log('No hay períodos de ranking. Creando uno por defecto...');
    const now = new Date();
    const trimestre = Math.floor(now.getMonth() / 3) + 1;
    periodoActivo = await prisma.periodoRanking.create({
      data: {
        nombre: `Q${trimestre} ${now.getFullYear()}`,
        fechaInicio: new Date(now.getFullYear(), (trimestre - 1) * 3, 1),
        fechaFin: new Date(now.getFullYear(), trimestre * 3, 0),
        estado: 'ACTIVO',
      },
    });
    console.log(`Período creado: ${periodoActivo.nombre}`);
  }

  console.log(`Usando período: ${periodoActivo.nombre}\n`);

  // 2. Obtener configuraciones de puntaje para asistencia
  const configTemprana = await prisma.configuracionPuntaje.findUnique({
    where: { codigo: 'asistencia_temprana' },
  });
  const configNormal = await prisma.configuracionPuntaje.findUnique({
    where: { codigo: 'asistencia_normal' },
  });
  const configTardia = await prisma.configuracionPuntaje.findUnique({
    where: { codigo: 'asistencia_tardia' },
  });

  if (!configTemprana || !configNormal || !configTardia) {
    console.error('Faltan configuraciones de puntaje. Ejecuta primero seed-gamificacion.ts');
    return;
  }

  console.log('Configuraciones de puntaje:');
  console.log(`  - Temprana: ${configTemprana.puntos} pts, ${configTemprana.xp} XP`);
  console.log(`  - Normal: ${configNormal.puntos} pts, ${configNormal.xp} XP`);
  console.log(`  - Tardía: ${configTardia.puntos} pts, ${configTardia.xp} XP\n`);

  // 2.5 Obtener el nivel inicial (Discípulo)
  const nivelInicial = await prisma.nivelBiblico.findFirst({
    where: { numero: 1 },
  });

  if (!nivelInicial) {
    console.error('No se encontró el nivel inicial (Discípulo). Ejecuta primero seed-gamificacion.ts');
    return;
  }

  console.log(`Nivel inicial: ${nivelInicial.nombre} (ID: ${nivelInicial.id})\n`);

  // 3. Obtener asistencias confirmadas con usuario que no tienen historial
  const asistenciasConfirmadas = await prisma.asistencia.findMany({
    where: {
      estado: 'confirmado',
      usuarioId: { not: null },
    },
    include: {
      usuario: true,
      qr: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total asistencias confirmadas con usuario: ${asistenciasConfirmadas.length}`);

  // Filtrar las que ya tienen historial
  const asistenciasSinPuntos: typeof asistenciasConfirmadas = [];

  for (const asistencia of asistenciasConfirmadas) {
    const existeHistorial = await prisma.historialPuntos.findFirst({
      where: {
        referenciaTipo: 'asistencia',
        referenciaId: asistencia.id,
      },
    });

    if (!existeHistorial) {
      asistenciasSinPuntos.push(asistencia);
    }
  }

  console.log(`Asistencias sin puntos asignados: ${asistenciasSinPuntos.length}\n`);

  if (asistenciasSinPuntos.length === 0) {
    console.log('No hay asistencias pendientes de asignar puntos.');
    return;
  }

  // 4. Procesar cada asistencia
  let procesadas = 0;
  let errores = 0;
  const usuariosActualizados = new Set<number>();

  for (const asistencia of asistenciasSinPuntos) {
    try {
      const usuarioId = asistencia.usuarioId!;

      // Obtener o crear perfil de gamificación
      let perfil = await prisma.usuarioGamificacion.findUnique({
        where: { usuarioId },
      });

      if (!perfil) {
        perfil = await prisma.usuarioGamificacion.create({
          data: {
            usuarioId,
            nivelId: nivelInicial.id,
          },
        });
      }

      // Determinar tipo de asistencia basado en hora
      let config = configNormal; // Por defecto
      let tipoAsistencia = 'normal';

      if (asistencia.qr) {
        const horaRegistro = asistencia.createdAt;
        const horaInicio = new Date(asistencia.qr.horaInicio);
        const margenTardia = asistencia.qr.margenTardia || 30;

        const registroMinutos = horaRegistro.getHours() * 60 + horaRegistro.getMinutes();
        const inicioMinutos = horaInicio.getHours() * 60 + horaInicio.getMinutes();
        const limiteTardiaMin = inicioMinutos + margenTardia;

        if (registroMinutos < inicioMinutos) {
          config = configTemprana;
          tipoAsistencia = 'temprana';
        } else if (registroMinutos <= limiteTardiaMin) {
          config = configNormal;
          tipoAsistencia = 'normal';
        } else {
          config = configTardia;
          tipoAsistencia = 'tardia';
        }
      }

      // Crear registro en historial
      await prisma.historialPuntos.create({
        data: {
          usuarioGamId: perfil.id,
          configPuntajeId: config.id,
          periodoRankingId: periodoActivo.id,
          puntos: config.puntos,
          xp: config.xp,
          descripcion: `Asistencia ${tipoAsistencia}`,
          fecha: asistencia.createdAt,
          referenciaId: asistencia.id,
          referenciaTipo: 'asistencia',
        },
      });

      // Actualizar totales del perfil
      await prisma.usuarioGamificacion.update({
        where: { id: perfil.id },
        data: {
          puntosTotal: { increment: config.puntos },
          puntosTrimestre: { increment: config.puntos },
          xpTotal: { increment: config.xp },
          asistenciasTotales: { increment: 1 },
        },
      });

      usuariosActualizados.add(usuarioId);
      procesadas++;

      if (procesadas % 50 === 0) {
        console.log(`  Procesadas: ${procesadas}/${asistenciasSinPuntos.length}`);
      }
    } catch (error) {
      errores++;
      console.error(`Error procesando asistencia ${asistencia.id}:`, error);
    }
  }

  console.log(`\nAsistencias procesadas: ${procesadas}`);
  console.log(`Errores: ${errores}`);
  console.log(`Usuarios actualizados: ${usuariosActualizados.size}`);

  // 5. Actualizar niveles de todos los usuarios afectados
  console.log('\nActualizando niveles...');

  const niveles = await prisma.nivelBiblico.findMany({
    where: { activo: true },
    orderBy: { xpRequerido: 'desc' },
  });

  let nivelesActualizados = 0;

  for (const usuarioId of usuariosActualizados) {
    const perfil = await prisma.usuarioGamificacion.findUnique({
      where: { usuarioId },
    });

    if (perfil) {
      // Encontrar el nivel correcto según XP
      const nivelCorrecto = niveles.find((n) => perfil.xpTotal >= n.xpRequerido);

      if (nivelCorrecto && nivelCorrecto.id !== perfil.nivelId) {
        await prisma.usuarioGamificacion.update({
          where: { id: perfil.id },
          data: { nivelId: nivelCorrecto.id },
        });
        nivelesActualizados++;
      }
    }
  }

  console.log(`Niveles actualizados: ${nivelesActualizados}`);
  console.log('\n=== Seeding completado ===');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedAsistenciasPuntos()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedAsistenciasPuntos };
