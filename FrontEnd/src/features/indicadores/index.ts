// API publica de la feature indicadores: lo unico que se puede usar fuera de features/indicadores/.
export { default as FichaTecnicaBoton } from './components/FichaTecnica/FichaTecnicaBoton';
export { MESES_CORTOS, MESES_LARGOS, MESES_LARGOS_ARR } from './constants/meses';
export { indicadoresService } from './services/indicadoresService';
export { descargarB64 } from './utils/download';
export { urlIcono } from './utils/iconos';
export type {
  ExcelIndicadores, FamiliaIndicadores, FichaIndicador, MetasSemaforo, Semaforo, Umbral,
} from './tipos';
