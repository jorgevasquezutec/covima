/**
 * Normaliza un numero de telefono eliminando caracteres no numericos
 */
export function normalizarTelefono(telefono: string): string {
  return telefono.replace(/\D/g, '');
}

/**
 * Extrae los ultimos 9 digitos de un telefono (numero sin codigo de pais)
 */
export function extraerNumeroLocal(telefono: string): string {
  return normalizarTelefono(telefono).slice(-9);
}
