/** Los años que se pueden consultar o generar: el anterior y el actual, salen de la fecha de hoy (cada enero se recorren solos). */
export function aniosConsultables(): number[] {
  const actual = new Date().getFullYear();
  return [actual - 1, actual];
}

/** Los meses (1-12) que ya pueden estar en el FTP: del año en curso solo hasta el mes actual, igual que al generar en FTP. */
export function mesesHastaHoy(anio: number): number[] {
  const hoy = new Date();
  const ultimo = anio === hoy.getFullYear() ? hoy.getMonth() + 1 : anio < hoy.getFullYear() ? 12 : 0;
  return Array.from({ length: ultimo }, (_, i) => i + 1);
}
