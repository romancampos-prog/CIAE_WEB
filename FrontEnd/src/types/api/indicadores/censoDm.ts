// Lo que responde src/api/indicadores/censoDmApi.ts (copia de schemas/model/censo_dm_Model.py).

export interface CensoDMSubido {
  anio: number;
  archivo: string;
  fecha_carga: string;
}

export interface ResultadoCargaCensoDM {
  anio: number;
  archivo: string;
  unidades: number;
  no_encontradas: string[];
  extras: string[];
  recalculados: string[];
}
