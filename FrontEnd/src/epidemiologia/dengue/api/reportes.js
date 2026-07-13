import api from '../../../shared/api/axiosInstance';

/**
 * Obtiene los datos del canal endémico: casos actuales, semanas y alertas históricas.
 * @returns {Promise<AxiosResponse>}
 */
export const getCanal              = ()     => api.get('/epidemiologia/reportes/canal');

/**
 * Obtiene los datos geoespaciales del mapa de dengue para un tipo de reporte.
 * @param {'situacion'|'confirmados'} tipo - Tipo de mapa a generar
 * @returns {Promise<AxiosResponse>}
 */
export const getMapa               = (tipo) => api.get(`/epidemiologia/reportes/mapa/${tipo}`);

/**
 * Obtiene las alertas operativas de SisCep (muestras rechazadas, pendientes, sin muestra, etc.).
 * @returns {Promise<AxiosResponse>}
 */
export const getAlertasSiscep      = ()     => api.get('/epidemiologia/reportes/alertas-siscep');

/**
 * Obtiene los registros duplicados confirmados y eliminados de la base.
 * @returns {Promise<AxiosResponse>}
 */
export const getDuplicados         = ()     => api.get('/epidemiologia/reportes/duplicados');

/**
 * Obtiene los registros que son posibles duplicados y requieren revisión manual.
 * @returns {Promise<AxiosResponse>}
 */
export const getPosiblesDuplicados = ()     => api.get('/epidemiologia/reportes/posibles-duplicados');
