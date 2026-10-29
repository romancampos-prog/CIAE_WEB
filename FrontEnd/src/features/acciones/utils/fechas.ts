// Fechas del OC30 tal cual llegan (dd/mm/aaaa).

export const FORMATO_FECHA = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** dd/mm/aaaa → aaaammdd, para ordenar y comparar como texto. */
export const fechaComparable = (fecha: string) => fecha.replace(FORMATO_FECHA, '$3$2$1');
