// ─── Wrapper universal de respuesta ──────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  status: 'success' | 'error';
  token: string;
  user: string;
}

export interface AuthUser {
  token: string;
  user: string;
  rol: 'admin' | 'visor';
}

// ─── Indicadores FTP ─────────────────────────────────────────────────────────

export type ColorSemaforo = 'Verde' | 'Amarillo' | 'Rojo' | 'Gris';

export interface DatoMes {
  mes: string;
  tasa: number;
  numerador: number;
  denominador: number;
  color: ColorSemaforo;
}

export interface SemaforoFijo {
  Esperado: number;
  Bajo?: number;
  Alto?: number;
}

export interface SemaforoMensual {
  [mes: string]: SemaforoFijo;
}

export interface OperacionIndicador {
  numerador: string;
  denominador: string;
  resultado: string;
}

export interface IndicadorInfo {
  titulo: string;
  fechaModificacion: string;
  descripcionNumerador: string;
  descripcionDenominador: string;
  nombreArchivoFinal: string;
  semaforo: SemaforoFijo | SemaforoMensual;
  reporte: Record<string, unknown>;
  operacion: OperacionIndicador;
}

export interface CategoriaFTP {
  indicadores: string[];
  icono: string;
}

export type ListaIndicadores = Record<string, CategoriaFTP>;

export interface DatosGraficaFTP {
  unidades: string[];
  meses_con_datos: string[];
  datos: Record<string, DatoMes[]>;
}

export interface ReporteFTPResponse {
  status: 'success' | 'error';
  mensaje?: string;
  archivo_b64: string;
  nombre_archivo: string;
  restricciones: Record<string, RestriccionError>;
  datos_grafica: Record<string, DatoMapa>;
}

export interface DatoMapa {
  resultado: number;
  numerador: number;
  denominador: number;
  color: ColorSemaforo;
}

export interface RestriccionError {
  nombreError: string;
  descripcionError: string;
  unidades: Record<string, { reportes: string[]; ruta: string }[]>;
}

export interface GenerarCategoriaResponse {
  status: 'success' | 'error';
  mensaje?: string;
  archivo_b64: string;
  nombre_archivo: string;
  completados: string[];
  errores: Record<string, string>;
  restricciones?: Record<string, RestriccionError>;
}

// ─── Población ────────────────────────────────────────────────────────────────

export interface SubirPoblacionResponse {
  unidades: string;
  no_encontradas: string[];
  extras: string[];
}

export interface RecalcularPoblacionResponse {
  total: number;
  errores: string[];
}

// ─── Indicadores IN_ASS ──────────────────────────────────────────────────────

export interface IndicadorInAss {
  id: string;
  subT2: string;
}

export interface SemaforoInAssRango {
  Mayor: number;
  Menor: number;
}

export interface SemaforoInAssUmbrales {
  Esperado: SemaforoInAssRango;
  Medio: SemaforoInAssRango;
  Tasa?: number;
}

export interface SemaforoInAss01 {
  HGS: SemaforoInAssUmbrales;
  Otros: SemaforoInAssUmbrales;
  Tasa?: number;
}

export interface InAssInfo {
  titulo: string;
  descripcionNumerador: string;
  descripcionDenominador: string;
  semaforo: SemaforoInAss01 | SemaforoInAssUmbrales;
  unidades_hgs?: string[];
}

export interface DatosGraficaInAss {
  unidades: string[];
  meses_con_datos: string[];
  datos: Record<string, Record<string, DatoMes[]>>;
}

export interface DescargarInAssResponse {
  archivo_b64: string;
  nombre_archivo: string;
}

export interface GenerarInAssResponse {
  status: 'success' | 'error';
  archivo_b64: string;
  nombre_archivo: string;
}

// ─── Reportes / Edición ──────────────────────────────────────────────────────

export interface InfoGeneralUpdate {
  id_indicador: string;
  titulo: string;
  descripcionNumerador?: string;
  descripcionDenominador?: string;
  nombreArchivoFinal?: string;
}

export interface SemaforoUpdate {
  id_indicador: string;
  semaforo: Record<string, unknown>;
}

// ─── Epidemiología ────────────────────────────────────────────────────────────

export interface PipelineEstado {
  corriendo: boolean;
  completado: boolean;
  error: string | null;
  paso: string;
  ultimo_reporte: string | null;
  archivos: {
    operativa: boolean;
    siscep: boolean;
  };
}

export interface DengueRegistro {
  DES_UNI_MED_NOTIF?: string;
  [key: string]: unknown;
}

export interface AlertasSiscepResponse {
  año: string;
  muestras_rechazadas: DengueRegistro[];
  pendientes_clasificar: DengueRegistro[];
  recibidas_adecuadas: DengueRegistro[];
  sin_muestra: DengueRegistro[];
  graves_sin_muestra: DengueRegistro[];
  tabla_negativos: Array<{ DES_UNI_MED_NOTIF: string; N_NEGATIVOS: number }>;
}
