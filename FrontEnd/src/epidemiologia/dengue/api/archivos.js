import api from '../../../shared/api/axiosInstance';

/**
 * Sube el archivo de base operativa (SINAVE) para el análisis de dengue.
 * @param {File} archivo - Archivo Excel con la base operativa
 * @returns {Promise<Object>} Respuesta con metadata del archivo guardado
 */
export const subirOperativa = (archivo) => {
    const form = new FormData();
    form.append('archivo', archivo);
    return api.post('/epidemiologia/archivos/operativa', form);
};

/**
 * Sube el archivo de base SisCep (resultados de laboratorio) para el análisis de dengue.
 * @param {File} archivo - Archivo Excel con los resultados de laboratorio
 * @returns {Promise<Object>} Respuesta con metadata del archivo guardado
 */
export const subirSiscep = (archivo) => {
    const form = new FormData();
    form.append('archivo', archivo);
    return api.post('/epidemiologia/archivos/siscep', form);
};
