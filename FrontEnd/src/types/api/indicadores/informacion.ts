// Lo que responde src/api/indicadores/informacionApi.ts (copia de los modelos del backend).

/** Un umbral del semáforo: número (formato viejo) o texto con operador (ej. "<= 30", ">= 4 a <= 7"). */
export type Umbral = number | string;

export interface MetasSemaforo {
  Esperado?: Umbral | null;
  Medio?: Umbral | null;
  Bajo?: Umbral | null;
  Alto?: Umbral | null;
}

/** Fijo (un bloque de metas), por mes ({Enero: metas}) o agrupado por otra cosa ({"Hospital 2do nivel": metas}). */
export type Semaforo = MetasSemaforo | Record<string, MetasSemaforo>;

export interface InformacionFicha {
  titulo: string;
  objetivo: string;
  descNum: string;
  descDen: string;
}

/** GET /Indicadores/informacion/ficha/{indicador} (modelo InfoIndicador). */
export interface FichaIndicador {
  modulo: string;
  mostrarGenerar: boolean;
  mostrarGrafica: boolean;
  periodicidad: string;
  descripcionPeriodicidad?: string | null;
  informacion: InformacionFicha;
  semaforo: Semaforo;
  grupoDeUnidad?: Record<string, string> | null;
}

/** GET /Indicadores/informacion/indicadores: una familia y sus indicadores. */
export interface FamiliaIndicadores {
  categoriaIndicador: string;
  indicadores: string[];
  imagen: string;
  color: string;
}

export type ModoExtraccion =
  | 'INTERSECCION_COLUMNA'
  | 'INTERSECCION_FILA'
  | 'ULTIMA_FILA'
  | 'FILTRO_CONTEO'
  | 'FILTRO_CONTEO_ACUMULADO'
  | 'FILTRO_UNIDAD_VALOR';

/** Un lado (numerador o denominador) del reporte en el mapeo. `detalle` cambia según el modo. */
export interface FuenteCalculo {
  fuente: string;
  modoExtraccion?: ModoExtraccion | null;
  detalle: DetalleFuente;
}

export interface FichaTecnicaCompleta {
  modulo: string;
  fechaModificacion: string;
  periodicidad: string;
  automatizado: boolean;
  informacion: InformacionFicha;
  reporte?: {
    numerador: FuenteCalculo;
    denominador: FuenteCalculo;
    operacion: { numerador: string; denominador: string; resultado: string };
  } | null;
  semaforo: Semaforo;
  /** Columnas que cambian según el mes (ej. CUPN 01: {"MESES_CIP01": {"1": "D", ...}}). */
  columnasPorMes: Record<string, Record<string, string>>;
}

/** Cómo se lee un archivo en los modos por posición (archivo.{CODIGO}). */
export interface ConfigArchivo {
  hoja?: string;
  modoExtraccion?: ModoExtraccion;
  columna?: string;
  buscar?: string;
  encabezado?: number | string;
  columna_dato?: string | string[];
  fila?: number | string | (number | string)[];
}

/** archivo.{CODIGO} = cómo se lee; sexo.{Grupo} = lista de grupos de edad (población). */
export type ConfigsFuente = Record<string, ConfigArchivo | string[]>;

export type TipoFiltro = 'LISTA' | 'RANGO' | 'PREFIJO' | 'SUFIJO';

export interface CondicionColumna {
  tipo?: TipoFiltro;
  filtro: (string | number)[] | string | number;
  nombreColumna?: string;
}

export interface GrupoColumnas {
  tipo: TipoFiltro;
  filtro: (string | number)[];
  columnas: Record<string, string>;
  coincidencia?: 'CUALQUIERA' | 'NINGUNA';
}

export interface CruceArchivo {
  activa?: boolean;
  codigosCandidatos: string[];
  archivoCruce: string;
  columnaLlave: string;
  codigosValidos: string[];
}

export interface DetalleFuente {
  archivo?: ConfigsFuente;
  sexo?: ConfigsFuente;
  hoja?: string;
  nombreArchivo?: string;
  filtroColumna?: Record<string, CondicionColumna>;
  filtroGrupoColumnas?: GrupoColumnas[];
  filtroAlternativas?: Record<string, CondicionColumna>[];
  cruce?: CruceArchivo;
  columnaUnidad?: Record<string, { nombreColumna?: string }>;
  tomarValor?: Record<string, string>;
}
