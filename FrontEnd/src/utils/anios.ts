// Años calculados con la fecha de hoy: al cambiar de año aparecen solos, sin tocar el código.

/** El año actual y los anteriores: [2027, 2026] con `hacia_atras` = 1. */
export function aniosHastaHoy(haciaAtras: number): number[] {
  const actual = new Date().getFullYear();
  return Array.from({ length: haciaAtras + 1 }, (_, i) => actual - i);
}

/** El año del último mes cerrado: en enero todavía es el año anterior (aún no hay datos del nuevo). */
export function anioDelMesAnterior(): number {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).getFullYear();
}
