import { PrismaClient, EstadoTurno } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding turnos de Limpieza...');

  const miembros = await prisma.miembroRolServicio.findMany({
    where: { tipoRolId: 1, activo: true },
    orderBy: { orden: 'asc' },
    include: { usuario: { select: { nombre: true } } },
  });

  const pool = miembros.map((m) => m.id);
  const n = pool.length; // 15
  const porTurno = 3;

  // Esta semana 28 mar toca: Piedad(11), Cristhian(13), Jean(15)
  // Piedad está en index 10 del pool
  // Así que el "offset" para esta semana es 10*1 = chunk starting at index 30 (mod 15 = 0? no)
  // Más simple: semana 28 mar → miembros en indices [10, 11, 12] → pero Cristhian es 12, Jean 14, no 11 y 12
  // Wait: Piedad=idx10, Belen=idx11, Cristhian=idx12, Carlos=idx13, Jean=idx14
  // So [10,12,14] no es consecutivo...

  // El usuario dice que esta semana toca Piedad, Cristhian y Jean específicamente
  // No son consecutivos en el pool. Son turnos manuales.
  // Voy a crear todos como PROGRAMADO con la rotación del pool (3 consecutivos)
  // y la semana del 28 la hago manual con Piedad, Cristhian, Jean

  // Sábados desde 3 ene 2026 hasta 9 may 2026
  const sabados: string[] = [];
  const start = new Date('2026-01-03');
  const end = new Date('2026-05-09');
  const cur = new Date(start);
  while (cur <= end) {
    sabados.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 7);
  }

  // Rotación normal: chunks de 3 del pool
  let chunkIndex = 0;
  const turnos: { semana: string; miembroIds: number[]; estado: EstadoTurno }[] = [];

  for (const sab of sabados) {
    if (sab === '2026-03-28') {
      // Esta semana: manual — Piedad, Cristhian, Jean
      const piedadId = miembros.find((m) => m.usuario?.nombre === 'Piedad Rivera')!.id;
      const cristhianId = miembros.find((m) => m.usuario?.nombre === 'Cristhian Ramirez Armijo')!.id;
      const jeanId = miembros.find((m) => m.usuario?.nombre === 'Jean Caso')!.id;
      turnos.push({ semana: sab, miembroIds: [piedadId, cristhianId, jeanId], estado: EstadoTurno.PROGRAMADO });
      // Don't advance chunkIndex — this is a manual override
      continue;
    }

    const ids: number[] = [];
    for (let i = 0; i < porTurno; i++) {
      ids.push(pool[(chunkIndex * porTurno + i) % n]);
    }

    const semanaDate = new Date(sab);
    const today = new Date('2026-03-23');
    const estado = semanaDate < today ? EstadoTurno.PROGRAMADO : EstadoTurno.PROGRAMADO;

    turnos.push({ semana: sab, miembroIds: ids, estado });
    chunkIndex++;
  }

  let created = 0;
  for (const t of turnos) {
    const semana = new Date(t.semana);
    const existing = await prisma.turnoRolServicio.findUnique({
      where: { tipoRolId_semana: { tipoRolId: 1, semana } },
    });
    if (existing) continue;

    const turno = await prisma.turnoRolServicio.create({
      data: {
        tipoRolId: 1,
        semana,
        estado: t.estado,
        asignaciones: {
          create: t.miembroIds.map((miembroId, i) => ({
            miembroId,
            orden: i + 1,
          })),
        },
      },
      include: {
        asignaciones: {
          include: { miembro: { include: { usuario: { select: { nombre: true } } } } },
          orderBy: { orden: 'asc' },
        },
      },
    });

    const nombres = turno.asignaciones.map((a) => a.miembro.usuario?.nombre || '?').join(', ');
    console.log(`  ${t.semana} → ${nombres}`);
    created++;
  }

  console.log(`\n${created} turnos creados`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
