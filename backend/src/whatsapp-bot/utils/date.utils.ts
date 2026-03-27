/**
 * Parsea texto con fecha a un objeto Date.
 * Soporta: "hoy", "manana", dd/mm, dd/mm/yyyy, dd-mm, dd-mm-yyyy
 */
export function parseFecha(texto: string): Date | null {
  if (!texto) return null;

  const lower = texto.toLowerCase();

  // "hoy"
  if (/\bhoy\b/i.test(lower)) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return hoy;
  }

  // "manana"
  if (/ma[ñn]ana/i.test(lower)) {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    manana.setHours(0, 0, 0, 0);
    return manana;
  }

  // Fechas en formato dd/mm o dd/mm/yyyy
  const matchFecha = texto.match(
    /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/,
  );
  if (matchFecha) {
    const dia = parseInt(matchFecha[1], 10);
    const mes = parseInt(matchFecha[2], 10) - 1;
    let anio = matchFecha[3]
      ? parseInt(matchFecha[3], 10)
      : new Date().getFullYear();
    if (anio < 100) anio += 2000;

    const fecha = new Date(anio, mes, dia);
    fecha.setHours(0, 0, 0, 0);
    return fecha;
  }

  return null;
}

/**
 * Formatea una fecha en formato legible en espanol (ej: "sabado, 25 de enero")
 */
export function formatFecha(fecha: Date): string {
  return fecha.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Formatea un objeto Date como hora HH:MM
 */
export function formatTime(time: Date | null): string | null {
  if (!time) return null;
  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
