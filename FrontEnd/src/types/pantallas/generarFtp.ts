// Pantalla de Generar FTP: familias, tipo de reporte, textos del semáforo y avisos de la población.

/** Los indicadores agrupados por familia, como los navega la página. */
export interface FamiliaFtp {
  categoriaIndicador: string;
  nombreCategoria: string;
  imagen: string;
  color: string;
  colorOscuro: string;
  indicadores: string[];
}

/** previo = semanal; final = el mes cerrado. */
export type TipoReporte = 'previo' | 'final';

/** Textos de los rangos del semáforo para el mes elegido. */
export interface TextosSemaforo {
  txtVerde: string;
  txtAmarillo: string | null;
  txtRojo: string;
}

export interface AdvertenciasCarga {
  no_encontradas: string[];
  extras: string[];
  celdasVacias: Record<string, string[]>;
  alias_sugeridos: Record<string, string>;
  advertenciaTitulo: string | null;
}

export type Severidad = 'critico' | 'advertencia';

/** Un problema de la ventana de errores: la misma unidad y ruta, aunque afecte a varios indicadores. */
export interface CasoError {
  unidad: string;
  indicadores: string[];
  reportes: string[];
  ruta: string;
}

/** Casos que vienen del mismo reporte e indicadores. */
export interface GrupoCasos {
  reportes: string[];
  indicadores: string[];
  casos: CasoError[];
}

/** Un mes del selector de Generar FTP y por qué se puede o no elegir. */
export interface EstadoMes {
  clave: string;
  nombre: string;
  disponible: boolean;
  tipo: 'disponible' | 'generado' | 'cerrado' | 'espera' | 'futuro';
  estado: string;
}
