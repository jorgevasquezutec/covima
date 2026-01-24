import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parsea una fecha ISO string evitando problemas de zona horaria
 * Extrae YYYY-MM-DD y crea la fecha en zona horaria local
 */
export function parseLocalDate(fecha: string): Date {
  const fechaStr = fecha.split('T')[0];
  const [year, month, day] = fechaStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formatea una fecha ISO string a formato legible en español
 */
export function formatDate(fecha: string, options?: Intl.DateTimeFormatOptions): string {
  const date = parseLocalDate(fecha);
  return date.toLocaleDateString('es-PE', options || {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
