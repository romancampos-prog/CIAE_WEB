// Pantalla de Generar FTP: familias, tipo de reporte, textos del semáforo y avisos de la población.

/** Los indicadores agrupados por familia, como los navega la página. */
export interface FamiliaFtp {
  categoriaIndicador: string;
  nombreCategoria: string;
  imagen: string;
  color: string;
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
