/**
 * Utilidades para manejo de fechas con zona horaria Lima (UTC-5)
 */

// Zona horaria de Lima, Perú
export const TIMEZONE = 'America/Lima';
export const TIMEZONE_OFFSET = -5; // UTC-5

/**
 * Obtiene la fecha actual en zona horaria Lima
 */
export function getNow(): Date {
  return new Date();
}

/**
 * Obtiene la fecha actual en Lima como string YYYY-MM-DD
 */
export function getTodayString(): string {
  const now = getNow();
  return formatDateToLocal(now);
}

/**
 * Convierte una fecha UTC a string YYYY-MM-DD en zona horaria Lima
 */
export function formatDateToLocal(date: Date): string {
  const localDate = new Date(date.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
  return localDate.toISOString().split('T')[0];
}

/**
 * Crea una fecha UTC que representa el inicio del día (00:00:00) en Lima
 * Útil para guardar fechas sin problema de zona horaria
 */
export function toStartOfDayUTC(dateString: string): Date {
  // dateString viene como 'YYYY-MM-DD'
  // Queremos que represente las 00:00 de Lima, que es 05:00 UTC
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0)); // 05:00 UTC = 00:00 Lima
  return date;
}

/**
 * Crea una fecha UTC que representa el fin del día (23:59:59.999) en Lima
 */
export function toEndOfDayUTC(dateString: string): Date {
  // dateString viene como 'YYYY-MM-DD'
  // Queremos que represente las 23:59:59.999 de Lima, que es 04:59:59.999 UTC del día siguiente
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1, 4, 59, 59, 999)); // 04:59:59.999 UTC del día siguiente = 23:59:59.999 Lima
  return date;
}

/**
 * Obtiene la fecha de hoy en Lima como Date UTC (inicio del día)
 */
export function getTodayAsUTC(): Date {
  return toStartOfDayUTC(getTodayString());
}

/**
 * Obtiene el inicio de la semana (sábado) para una fecha dada
 * Devuelve la fecha en formato UTC (05:00 UTC = 00:00 Lima) para comparación con DB
 */
export function getInicioSemana(fecha: Date): Date {
  // Obtener la fecha en formato local de Lima (YYYY-MM-DD)
  const fechaStr = formatDateToLocal(fecha);
  const [year, month, day] = fechaStr.split('-').map(Number);

  // Crear fecha local para calcular el día de la semana
  const localDate = new Date(year, month - 1, day);
  const dayOfWeek = localDate.getDay();

  // Calcular días hasta el sábado anterior (o actual si es sábado)
  // Domingo = 0, Lunes = 1, ..., Sábado = 6
  const diff = dayOfWeek === 6 ? 0 : -(dayOfWeek + 1);
  localDate.setDate(localDate.getDate() + diff);

  // Convertir a formato UTC (05:00 UTC = 00:00 Lima)
  const sabadoStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
  return toStartOfDayUTC(sabadoStr);
}

/**
 * Construye los filtros de fecha para Prisma
 */
export function buildDateFilter(
  fechaDesde?: string,
  fechaHasta?: string,
): { gte?: Date; lte?: Date } | undefined {
  if (!fechaDesde && !fechaHasta) return undefined;

  const filter: { gte?: Date; lte?: Date } = {};

  if (fechaDesde) {
    filter.gte = toStartOfDayUTC(fechaDesde);
  }
  if (fechaHasta) {
    filter.lte = toEndOfDayUTC(fechaHasta);
  }

  return filter;
}

/**
 * Calcula la paginación
 */
export function calculatePagination(page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;
  return { skip, take: limit };
}

/**
 * Construye el objeto meta de paginación
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
