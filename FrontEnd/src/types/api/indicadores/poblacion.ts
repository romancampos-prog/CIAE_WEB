// Lo que responde src/api/indicadores/poblacionApi.ts (copia de los modelos del backend).

export interface ArchivoPoblacion {
  nombre_sin_ext: string | null;
  mes_detectado: string | null;
  anio_detectado: number | null;
}

export interface ResultadoCargaPoblacion {
  nombre: string;
  nombre_sin_ext: string;
  unidades: number;
  no_encontradas: string[];
  extras: string[];
  celdas_vacias: number;
  errores_datos: { unidad: string; grupo: string; columna: string }[];
  alias_sugeridos: Record<string, string>;
  mes_detectado: string | null;
  anio_detectado: number | null;
  advertencia_titulo: string | null;
}

export interface ResultadoRecalculoPoblacion {
  total: number;
  recalculados: { indicador: string; meses: number; detalle: string }[];
  errores: string[];
  cortes_extractor: { indicador: string; corte: string }[];
}
