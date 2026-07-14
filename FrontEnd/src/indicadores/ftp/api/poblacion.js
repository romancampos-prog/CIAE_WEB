import api from '../../../shared/api/axiosInstance';

/**
 * Sube el archivo de población al servidor para actualizar los denominadores de todos los indicadores FTP.
 * @param {File} archivo - Archivo Excel con los datos de población
 * @returns {Promise<Object>} Resultado de la carga
 */
export const subirArchivoPoblacion = async (archivo) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    const respuesta = await api.post('/ftp/poblacion/subir', formData);
    return respuesta.data;
};

/**
 * Ordena al backend recalcular todos los indicadores FTP con la población actualizada.
 * @param {string} [ano='2026'] - Año para el que se recalcula
 * @returns {Promise<Object>} Resultado del recálculo
 */
export const recalcularPoblacion = async (ano = '2026') => {
    const respuesta = await api.post('/reportes/recalcular-poblacion', { ano });
    return respuesta.data;
};
