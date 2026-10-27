// Lo que responde src/api/dengue/reportesApi.ts (copia de los modelos del backend).

// propios
import type { FeatureCollection, Geometry } from 'geojson';

/** Un registro de la base (caso o duplicado): columnas de SINAVE/SisCep por nombre. */
export type RegistroCaso = Record<string, string | number | null>;

/** Un par que podría ser el mismo caso (posibles_duplicados.json). */
export interface PosibleDuplicado {
  VEC_ID_A: string; IDE_NOM_A: string; IDE_APE_PAT_A: string; IDE_APE_MAT_A: string;
  DES_DIAG_FINAL_A: string; CLASIF_A: string; FEC_NOTIF_A: string;
  VEC_ID_B: string; IDE_NOM_B: string; IDE_APE_PAT_B: string; IDE_APE_MAT_B: string;
  DES_DIAG_FINAL_B: string; CLASIF_B: string; FEC_NOTIF_B: string;
  SIM_APE_PAT: number; SIM_APE_MAT: number; SIM_NOMBRE: number;
  RAZON: string;
}

export interface DatosCanal {
  año: number;
  semanas: number[];
  q1: number[];
  mediana: number[];
  q3: number[];
  casos_actual: number[];
  zonas: string[];
  alertas: { sem: number; casos: number; umbral: number; zona: string }[];
}

export interface DatosAlertasSiscep {
  año: number;
  muestras_rechazadas: RegistroCaso[];
  pendientes_clasificar: RegistroCaso[];
  recibidas_adecuadas: RegistroCaso[];
  sin_muestra: RegistroCaso[];
  graves_sin_muestra: RegistroCaso[];
  tabla_negativos: { DES_UNI_MED_NOTIF: string; N_NEGATIVOS: number }[];
}

export type TipoMapa = 'situacion' | 'confirmados';

export interface PropiedadesMunicipio {
  state_code: number;
  mun_code: number;
  mun_name: string;
  MUNICIPIO: string;
  N_CASOS: number;
  NOMBRE: string;
}

export interface BroteEspacial {
  ventana: string;
  sem_inicio: number;
  sem_fin: number;
  cp: number;
  colonia: string;
  municipio: string;
  casos: number;
  lof_score: number;
  lat: number;
  lon: number;
}

export interface BroteTemporal {
  ventana: string;
  sem_inicio: number;
  sem_fin: number;
  cp: number;
  colonia: string;
  municipio: string;
  casos_actual: number;
  media_historica: number;
  umbral: number;
  incremento: number;
  lat: number;
  lon: number;
}

export interface DatosMapa {
  tipo: TipoMapa;
  año: number;
  geojson: FeatureCollection<Geometry, PropiedadesMunicipio>;
  max_casos: number;
  total: number;
  mun_con_casos: number;
  unidades: { unidad: string; n: number }[];
  brotes_espacial: BroteEspacial[];
  brotes_temporal: BroteTemporal[];
}
