// Lo que responde src/api/indicadores/extractorApi.ts (copia de los modelos del backend).

export interface ArchivoDeIndicador {
  /** Nombre legible ("SUI-13"). */
  archivo: string;
  requerido: boolean;
  uso: string;
}

/** GET /Indicadores/extractor/indicadores. */
export interface IndicadorGenerarExtractor {
  indicador: string;
  categoria: string;
  nombreCategoria: string;
  titulo: string;
  periodicidad: string;
  descripcionPeriodicidad?: string | null;
  imagen: string;
  color: string;
  tipo: 'corte' | 'mensual';
  agrupacion: string;
  denominador: string;
  archivos: ArchivoDeIndicador[];
}

export type EstadoMesArchivo = 'completo' | 'parcial' | 'pendiente' | 'sin_principal' | 'sin_registro';

/** GET /Indicadores/extractor/estado-archivos: un archivo y su estado en cada mes. */
export interface ArchivoExtractor {
  archivo: string;
  prefijoArchivo: string;
  /** Cómo conviene llamar el archivo, con {MM} y {AAAA} por llenar (catalogos/archivos_extractor.json). */
  nombreSugerido: string;
  tipo: 'principal' | 'cruce';
  requerido: boolean;
  uso: string;
  indicadores: string[];
  meses: { mes: string; estado: EstadoMesArchivo; faltan?: string[] }[];
}

/** GET /Indicadores/extractor/estado-cortes: cada ventana de corte ("Junio 2026", ...). */
export interface EstadoCorte {
  mesCorte: string;
  anioCorte: number;
  mesesSubidos: number;
  mesesTotales: number;
  completo: boolean;
  corteYaGenerado: boolean;
  detalle: { mes: string; anio: number; subido: boolean }[];
}

/** Lo que pasó con un indicador al procesar un archivo (POST /generar y /completar-cruce). */
export interface ResultadoIndicadorExtractor {
  indicador?: string;
  tipo?: 'corte' | 'mensual';
  error?: string;
  pendiente?: string;
  detalle?: string;
  total?: { numerador: number | null; denominador: number | null; '%': number | null; desempeno: string };
  numerador_por_unidad?: Record<string, number>;
  validados_via2?: number;
  corte_generado?: boolean;
  cortes_recalculados?: string[];
  cruce_pendiente?: boolean;
}
