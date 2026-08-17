import api from '../../../shared/api/axiosInstance';

/**
 * Obtiene todos los indicadores FTP agrupados por categoría.
 * @param {string} [campo='mostrarGrafica'] - Campo de filtro: "mostrarGrafica"
 *   (gráficas/descargas, default) o "generaFTP" (solo los que sí corren por
 *   el pipeline automático -- usado en la página de Generar FTP).
 * @returns {Promise<Object<string, {color:string, indicadores:string[]}>>} Mapa categoría → metadatos
 */
export const getAllIndicadores = async (campo = 'mostrarGrafica') => {
    try {
        const respuesta = await api.get('/ftp/todos', { params: { campo } });
        return respuesta.data;
    } catch (error) {
        console.error('Error al traer todos los indicadores', error);
        throw error;
    }
};

/**
 * Obtiene la ficha técnica de un indicador FTP (semáforo, fórmula, descripción, etc.).
 * @param {string} indicador - Clave del indicador (ej. "CACU 01")
 * @returns {Promise<Object>} Metadatos del indicador
 */
export const getIndicador = async (indicador) => {
    try {
        const respuesta = await api.get('/ftp/informacion', {
            params: { indicador }
        });
        return respuesta.data;
    } catch (error) {
        console.error('Error en la petición GET indicador:', error);
        throw error;
    }
};

/**
 * Obtiene los datos históricos para graficar las tasas de un indicador FTP.
 * @param {string} indicador - Clave del indicador
 * @param {string} anio - Año a consultar
 * @returns {Promise<{unidades:string[], meses_con_datos:string[], datos:Object}>}
 */
export const getFTPDatosGrafica = async (indicador, anio) => {
    try {
        const { data } = await api.get('/reportes/FTP/datos-grafica', {
            params: { indicador, anio }
        });
        return data.data ?? { unidades: [], meses_con_datos: [], datos: {} };
    } catch {
        return { unidades: [], meses_con_datos: [], datos: {} };
    }
};
