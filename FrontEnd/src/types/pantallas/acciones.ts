// Tipos propios de la pantalla de Acciones (Epidemiología, OC30).

/** Filtros de la tabla: solo recortan lo que ya llegó del backend. */
export interface FiltrosAcciones {
  /** Busca en todas las columnas (NSS, nombre, fecha...). */
  texto: string;
  /** Valor de la primera columna del filtro del mapeo (ej. Clave de la Acción); '' = todas. */
  clave: string;
  /** '' = todas. */
  unidad: string;
}
