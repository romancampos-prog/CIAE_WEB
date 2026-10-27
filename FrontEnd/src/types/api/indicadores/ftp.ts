// Lo que responde src/api/indicadores/ftpApi.ts (copia de los modelos del backend).

/** GET /Indicadores/ftp/indicadores (modelo IndicadorGenerarFTP). */
export interface IndicadorGenerarFtp {
  indicador: string;
  categoria: string;
  nombreCategoria: string;
  titulo: string;
  periodicidad: string;
  descripcionPeriodicidad?: string | null;
  imagen: string;
  color: string;
  /** Códigos SIAIS que lee, ej. ["CP02", "CP03"]. */
  reportes: string[];
}

/** El periodo a generar: mes "01".."12" y semana "1".."5" (solo en previo). */
export interface PeriodoFtp {
  ano: string;
  mes: string;
  semana: string | null;
}

export interface RutaAfectada {
  reportes: string[];
  ruta: string;
}

/** Un tipo de error de extracción (ej. RUTA_INVALIDA) con las unidades y rutas que lo tuvieron. */
export interface ErrorExtraccion {
  nombreError: string;
  descripcionError: string;
  unidades: Record<string, RutaAfectada[]>;
}

/** Las "restricciones" que muestra el modal: un ErrorExtraccion por tipo. */
export type Restricciones = Record<string, ErrorExtraccion>;

export interface ResultadoIndicadorFtp {
  restricciones: Restricciones;
}

export interface ResultadoCategoriaFtp {
  completados: string[];
  errores: Record<string, string | Restricciones>;
  restricciones: Restricciones;
}
