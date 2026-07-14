import api from '../../../shared/api/axiosInstance';

/**
 * Obtiene el estado actual del pipeline de dengue (corriendo, paso, completado, error, último reporte).
 * @returns {Promise<AxiosResponse>}
 */
export const getEstado = () => api.get('/epidemiologia/pipeline/estado');

/**
 * Inicia la ejecución del pipeline completo de análisis epidemiológico.
 * @returns {Promise<AxiosResponse>}
 */
export const ejecutar  = () => api.post('/epidemiologia/pipeline/ejecutar');
