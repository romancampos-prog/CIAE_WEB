// Tipos propios de la pantalla de Acciones (Epidemiología, OC30).

/** Filtros de la tabla: solo recortan lo que ya llegó del backend. */
export interface FiltrosAcciones {
  /** Valores elegidos de la primera columna del filtro del mapeo (ej. Clave de la Acción); [] = todas. */
  claves: string[];
  /** [] = todas. */
  unidades: string[];
  /** Rango de la columna de fecha, con fechas tal cual llegan (dd/mm/aaaa); '' = sin límite. */
  desde: string;
  hasta: string;
  /** Búsqueda por columna (NSS, nombre, agregado...): {columna: texto}; '' o sin la columna = sin filtro. */
  textos: Record<string, string>;
}
