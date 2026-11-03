// Fechas del OC30 tal cual llegan (dd/mm/aaaa).

export const FORMATO_FECHA = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** dd/mm/aaaa → aaaammdd, para ordenar y comparar como texto. */
export const fechaComparable = (fecha: string) => fecha.replace(FORMATO_FECHA, '$3$2$1');

/** dd/mm/aaaa → aaaa-mm-dd, como lo usa <input type="date"> y lo pide el backend. */
export const fechaIso = (fecha: string) => fecha.replace(FORMATO_FECHA, '$3-$2-$1');

/** Hoy en aaaa-mm-dd con la hora local (toISOString usa UTC y de noche daría mañana). */
export const hoyIso = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
};
