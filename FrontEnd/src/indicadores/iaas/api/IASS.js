import api from '@shared/api/axiosInstance';

/**
 * Obtiene la lista de indicadores IAAS disponibles en el sistema.
 * @returns {Promise<Array>} Lista de indicadores con id y descripción
 */
export const getIndicadoresIASS = async () => {
    try {
        const { data } = await api.get('/iass/indicadores');
        return data.data ?? [];
    } catch (error) {
        console.error('Error al obtener indicadores IASS:', error);
        return [];
    }
};

/**
 * Obtiene la lista de unidades médicas participantes en IAAS.
 * @returns {Promise<Array<string>>} Lista de claves de unidad
 */
export const getUnidadesIASS = async () => {
    try {
        const { data } = await api.get('/iass/unidades');
        return data.data ?? [];
    } catch (error) {
        console.error('Error al obtener unidades IASS:', error);
        return [];
    }
};

/**
 * Obtiene metadatos de todos los indicadores IAAS (semáforo, fórmula, etc.).
 * @returns {Promise<Object>} Objeto indexado por id de indicador
 */
export const infoBasicaInAass = async () => {
    const { data } = await api.get('/iass/info');
    return data;
};

/**
 * Envía los archivos y denominadores para generar los 6 reportes IAAS del período.
 * @param {string} anio - Año del reporte (ej. "2026")
 * @param {string} mes - Mes en formato "MM" (ej. "03")
 * @param {Object<string, File>} numerador - Archivos Excel por unidad (numeradores IAAS 01–06)
 * @param {Object<string, Object<string, string>>} denominador - Denominadores por unidad e indicador
 * @param {File|null} excel_denominador_IASS_01 - Excel global para calcular el denominador de IAAS 01
 * @returns {Promise<Object>} Resultado de generación con archivo_b64 y nombre_archivo
 */
export const generarIASS = async (anio, mes, numerador, denominador, excel_denominador_IASS_01) => {
    const form = new FormData();
    form.append('anio', anio);
    form.append('mes', mes);
    if (excel_denominador_IASS_01) form.append('excel_denominador_IASS_01', excel_denominador_IASS_01);
    if (numerador) Object.entries(numerador).forEach(([unidad, file]) => {
        form.append('numerador', new File([file], unidad, { type: file.type }));
    });
    const denPorIndicador = {};
    Object.entries(denominador).forEach(([unidad, inds]) => {
        Object.entries(inds).forEach(([ind, val]) => {
            if (!denPorIndicador[ind]) denPorIndicador[ind] = {};
            denPorIndicador[ind][unidad] = val;
        });
    });
    form.append('denominador', JSON.stringify(denPorIndicador));
    const { data } = await api.post('/reportes/IASS/Generar', form);
    return data;
};

/**
 * Obtiene los datos históricos para graficar las tasas de todos los indicadores IAAS.
 * @param {string} anio - Año a consultar
 * @returns {Promise<{unidades: string[], meses_con_datos: string[], datos: Object}>}
 */
export const getIASSDatosGrafica = async (anio) => {
    try {
        const { data } = await api.get('/reportes/IASS/datos-grafica', { params: { anio } });
        return data.data ?? { unidades: [], meses_con_datos: [], datos: {} };
    } catch {
        return { unidades: [], meses_con_datos: [], datos: {} };
    }
};

/**
 * Descarga el reporte IAAS guardado en el servidor para el año indicado.
 * @param {string} anio - Año del reporte
 * @param {string|null} indicador - Si se especifica, descarga solo ese indicador; si es null descarga todos
 * @returns {Promise<{archivo_b64: string, nombre_archivo: string}>}
 */
export const descargarIASSGuardado = async (anio, indicador = null) => {
    const params = indicador ? { anio, indicador } : { anio };
    const { data } = await api.get('/reportes/IASS/descargar', { params });
    return data.data ?? data;
};

/**
 * Obtiene el estado de la sesión IAAS del período: unidades pendientes, denominadores guardados, etc.
 * @param {string} anio - Año
 * @param {string} mes - Mes en formato "MM"
 * @returns {Promise<Object|null>} Datos de sesión o null si no existe
 */
export const getSesionIASS = async (anio, mes) => {
    try {
        const { data } = await api.get('/iass/sesion', { params: { anio, mes } });
        return data.data ?? null;
    } catch {
        return null;
    }
};

/**
 * Completa los datos de una unidad que entregó su información fuera de tiempo.
 * @param {string} anio - Año
 * @param {string} mes - Mes en formato "MM"
 * @param {string} unidad - Clave de la unidad tardía
 * @param {string[]} indicadores - IDs de indicadores pendientes
 * @param {Object} denominadores - Denominadores capturados
 * @param {File|null} excelFile - Archivo Excel de la unidad
 * @param {string} password - Contraseña de autorización
 * @returns {Promise<Object>} Resultado con archivo_b64 si se generó correctamente
 */
export const completarUnidadTardia = async (anio, mes, unidad, indicadores, denominadores, excelFile, password) => {
    const form = new FormData();
    form.append('anio', anio);
    form.append('mes', mes);
    form.append('unidad', unidad);
    form.append('indicadores', JSON.stringify(indicadores));
    form.append('denominadores', JSON.stringify(denominadores));
    form.append('password', password);
    if (excelFile) form.append('excel_unidad', excelFile);
    const { data } = await api.post('/iass/completar-unidad', form);
    return data;
};

/**
 * Obtiene los meses que ya tienen reporte IAAS guardado en el servidor.
 * @param {string} anio - Año a consultar
 * @returns {Promise<string[]>} Lista de meses en formato "MM" con reporte guardado
 */
export const getIASSMesesGuardados = async (anio) => {
    try {
        const { data } = await api.get('/reportes/IASS/meses-guardados', { params: { anio } });
        return data.data?.meses ?? [];
    } catch {
        return [];
    }
};
