import { PrismaClient, CategoriaAccion } from '@prisma/client';

const prisma = new PrismaClient();

// Fórmula de XP: XP = base * (nivel - 1)^2
const calcularXpParaNivel = (numeroNivel: number, base: number = 100): number => {
  if (numeroNivel <= 1) return 0;
  return base * Math.pow(numeroNivel - 1, 2);
};

async function seedGamificacion() {
  console.log('Seeding gamificación...');

  // ==================== NIVELES BÍBLICOS ====================
  // XP se calcula automáticamente con la fórmula: 100 × (nivel - 1)²
  const nivelesBase = [
    { numero: 1, nombre: 'Discípulo', descripcion: 'Inicio del camino de fe', icono: '🌱', color: '#9CA3AF' },
    { numero: 2, nombre: 'Diácono', descripcion: 'Servidor fiel', icono: '🤝', color: '#78716C' },
    { numero: 3, nombre: 'Anciano', descripcion: 'Guía espiritual', icono: '📖', color: '#A16207' },
    { numero: 4, nombre: 'Levita', descripcion: 'Ministro del templo', icono: '🎵', color: '#65A30D' },
    { numero: 5, nombre: 'Sacerdote', descripcion: 'Mediador ante Dios', icono: '🙏', color: '#0891B2' },
    { numero: 6, nombre: 'Profeta', descripcion: 'Portavoz divino', icono: '📜', color: '#7C3AED' },
    { numero: 7, nombre: 'Apóstol', descripcion: 'Enviado con misión', icono: '✨', color: '#DB2777' },
    { numero: 8, nombre: 'Evangelista', descripcion: 'Proclamador del evangelio', icono: '🔥', color: '#EA580C' },
    { numero: 9, nombre: 'Querubín', descripcion: 'Guardián celestial', icono: '👼', color: '#2563EB' },
    { numero: 10, nombre: 'Serafín', descripcion: 'En la presencia de Dios', icono: '🌟', color: '#F59E0B' },
  ];

  // Agregar XP calculado automáticamente
  const niveles = nivelesBase.map(nivel => ({
    ...nivel,
    xpRequerido: calcularXpParaNivel(nivel.numero),
  }));

  for (const nivel of niveles) {
    await prisma.nivelBiblico.upsert({
      where: { numero: nivel.numero },
      update: nivel,
      create: nivel,
    });
  }
  console.log(`Created ${niveles.length} niveles bíblicos`);

  // ==================== CONFIGURACIÓN DE PUNTAJES ====================
  const configuraciones = [
    // Asistencia
    { codigo: 'asistencia_temprana', categoria: CategoriaAccion.ASISTENCIA, nombre: 'Asistencia Temprana', descripcion: 'Llegar antes de la hora de inicio', puntos: 5, xp: 10 },
    { codigo: 'asistencia_normal', categoria: CategoriaAccion.ASISTENCIA, nombre: 'Asistencia Normal', descripcion: 'Llegar dentro del margen establecido', puntos: 3, xp: 6 },
    { codigo: 'asistencia_tardia', categoria: CategoriaAccion.ASISTENCIA, nombre: 'Asistencia Tardía', descripcion: 'Llegar después del margen', puntos: 1, xp: 2 },

    // Participación
    { codigo: 'direccion_programa', categoria: CategoriaAccion.PARTICIPACION, nombre: 'Dirección de Programa', descripcion: 'Dirigir el programa JA', puntos: 10, xp: 20 },
    { codigo: 'tema_central', categoria: CategoriaAccion.PARTICIPACION, nombre: 'Tema Central', descripcion: 'Presentar el tema central', puntos: 8, xp: 16 },
    { codigo: 'oracion', categoria: CategoriaAccion.PARTICIPACION, nombre: 'Oración', descripcion: 'Participar con oración', puntos: 3, xp: 6 },
    { codigo: 'cantos', categoria: CategoriaAccion.PARTICIPACION, nombre: 'Espacio de Cantos', descripcion: 'Dirigir cantos', puntos: 5, xp: 10 },
    { codigo: 'especial', categoria: CategoriaAccion.PARTICIPACION, nombre: 'Especial Musical', descripcion: 'Participar con especial', puntos: 6, xp: 12 },
    { codigo: 'notijoven', categoria: CategoriaAccion.PARTICIPACION, nombre: 'Notijoven', descripcion: 'Presentar notijoven', puntos: 4, xp: 8 },
    { codigo: 'dinamica', categoria: CategoriaAccion.PARTICIPACION, nombre: 'Dinámica', descripcion: 'Dirigir dinámica', puntos: 4, xp: 8 },
    { codigo: 'testimonio', categoria: CategoriaAccion.PARTICIPACION, nombre: 'Testimonio', descripcion: 'Compartir testimonio', puntos: 5, xp: 10 },

    // Bonus
    { codigo: 'racha_4_semanas', categoria: CategoriaAccion.BONUS, nombre: 'Bonus Racha 4 Semanas', descripcion: 'Asistir 4 semanas consecutivas', puntos: 15, xp: 30 },
    { codigo: 'racha_8_semanas', categoria: CategoriaAccion.BONUS, nombre: 'Bonus Racha 8 Semanas', descripcion: 'Asistir 8 semanas consecutivas', puntos: 30, xp: 60 },
    { codigo: 'racha_12_semanas', categoria: CategoriaAccion.BONUS, nombre: 'Bonus Racha 12 Semanas', descripcion: 'Asistir 12 semanas consecutivas', puntos: 50, xp: 100 },
  ];

  for (const config of configuraciones) {
    await prisma.configuracionPuntaje.upsert({
      where: { codigo: config.codigo },
      update: config,
      create: config,
    });
  }
  console.log(`Created ${configuraciones.length} configuraciones de puntaje`);

  // ==================== INSIGNIAS ====================
  const insignias = [
    { codigo: 'madrugador', nombre: 'Madrugador', descripcion: 'Llegar temprano 10 veces', icono: '🌅', color: '#F59E0B', condicionTipo: 'asistencias_tempranas', condicionValor: 10, puntosBonus: 10, xpBonus: 20 },
    { codigo: 'constante', nombre: 'Constante', descripcion: 'Racha de 4 semanas', icono: '🔄', color: '#10B981', condicionTipo: 'racha_semanas', condicionValor: 4, puntosBonus: 15, xpBonus: 30 },
    { codigo: 'orador', nombre: 'Orador', descripcion: 'Presentar 5 temas centrales', icono: '🎤', color: '#8B5CF6', condicionTipo: 'temas_centrales', condicionValor: 5, puntosBonus: 20, xpBonus: 40 },
    { codigo: 'lider', nombre: 'Líder', descripcion: 'Dirigir 10 programas', icono: '👑', color: '#F97316', condicionTipo: 'direcciones', condicionValor: 10, puntosBonus: 25, xpBonus: 50 },
    { codigo: 'fiel', nombre: 'Fiel', descripcion: 'Racha de 12 semanas', icono: '⭐', color: '#EAB308', condicionTipo: 'racha_semanas', condicionValor: 12, puntosBonus: 50, xpBonus: 100 },
    { codigo: 'melodioso', nombre: 'Melodioso', descripcion: 'Participar en 10 especiales', icono: '🎵', color: '#EC4899', condicionTipo: 'especiales', condicionValor: 10, puntosBonus: 20, xpBonus: 40 },
    { codigo: 'veterano', nombre: 'Veterano', descripcion: '50 asistencias totales', icono: '🏆', color: '#6366F1', condicionTipo: 'asistencias_totales', condicionValor: 50, puntosBonus: 30, xpBonus: 60 },
    { codigo: 'centurion', nombre: 'Centurión', descripcion: '100 asistencias totales', icono: '🛡️', color: '#14B8A6', condicionTipo: 'asistencias_totales', condicionValor: 100, puntosBonus: 100, xpBonus: 200 },
  ];

  for (const insignia of insignias) {
    await prisma.insignia.upsert({
      where: { codigo: insignia.codigo },
      update: insignia,
      create: insignia,
    });
  }
  console.log(`Created ${insignias.length} insignias`);

  // ==================== EVENTOS ESPECIALES ====================
  const eventos = [
    { codigo: 'd13', nombre: 'Dicipulo 13', descripcion: 'Participación en el Dicipulo 13', puntos: 10, xp: 20, icono: '📅', color: '#DC2626' },
    { codigo: 'reavivados', nombre: 'Reavivados por su Palabra', descripcion: 'Ganador en Reavivados', puntos: 5, xp: 10, icono: '📖', color: '#2563EB' },
    { codigo: 'semana_oracion', nombre: 'Semana de Oración', descripcion: 'Asistencia a Semana de Oración', puntos: 8, xp: 16, icono: '🙏', color: '#7C3AED' },
    { codigo: 'evangelismo', nombre: 'Evangelismo', descripcion: 'Participación en jornada de evangelismo', puntos: 12, xp: 24, icono: '📢', color: '#EA580C' },
    { codigo: 'proyecto_comunitario', nombre: 'Proyecto Comunitario', descripcion: 'Participación en proyecto comunitario', puntos: 10, xp: 20, icono: '🤝', color: '#65A30D' },
    //tema en el grupo pequeño
    { codigo: 'tema_pequeno', nombre: 'Tema en el grupo pequeño', descripcion: 'Presentar tema en el grupo pequeño', puntos: 10, xp: 20, icono: '📅', color: '#DC2626' },
    //trajo compartir grupo pequeno
    { codigo: 'trajo_pequeno', nombre: 'Trajo compartir grupo pequeno', descripcion: 'Trajo el compartir en el grupo pequeno', puntos: 10, xp: 20, icono: '📅', color: '#DC2626' },
    //presto su casa para el grupo pequeno
    { codigo: 'presto_casa_pequeno', nombre: 'Presto su casa para el grupo pequeno', descripcion: 'Presto su casa para el grupo pequeno', puntos: 10, xp: 20, icono: '📅', color: '#DC2626' },
    //donacion semana infantil
    { codigo: 'donacion_infantil', nombre: 'Donacion semana infantil', descripcion: 'Donacion semana infantil', puntos: 10, xp: 20, icono: '🙏', color: '#DC2626' },
    //llenado de datos ja 
    { codigo: 'llenado_datos_ja', nombre: 'Llenado de datos ja', descripcion: 'Llenado de datos ja', puntos: 10, xp: 20, icono: '📅', color: '#DC2626' },
    //participacion ayuno
    { codigo: 'participacion_ayuno', nombre: 'Participacion ayuno', descripcion: 'Participacion ayuno', puntos: 10, xp: 20, icono: '📅', color: '#DC2626' },
    //direccion escuela sabatica
    { codigo: 'direccion_escuela_sabatica', nombre: 'Direccion escuela sabatica', descripcion: 'Direccion escuela sabatica', puntos: 10, xp: 20, icono: '📅', color: '#DC2626' },
    //Evento Dia de la amistad
    { codigo: 'dia_amistad', nombre: 'Dia de la amistad', descripcion: 'Dia de la amistad', puntos: 10, xp: 20, icono: '📅', color: '#DC2626' },
  ];

  for (const evento of eventos) {
    await prisma.eventoEspecialConfig.upsert({
      where: { codigo: evento.codigo },
      update: evento,
      create: evento,
    });
  }
  console.log(`Created ${eventos.length} eventos especiales`);

  console.log('Seeding gamificación completed!');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedGamificacion()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedGamificacion };
