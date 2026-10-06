import api from '../../../shared/api/axiosInstance';

/**
 * Consulta la lista de indicadores que vive en el módulo Extractor
 * (los que usan el motor "extractor" / FILTRO_CONTEO_ACUMULADO en el mapeo).
 * @returns {Promise<string[]>} ej. ["EH 03", "DM 04"]
 */
export const getIndicadoresExtractor = async () => {
    try {
        const { data } = await api.get('/Indicadores/extractor/indicadores');
        return data.data ?? [];
    } catch (error) {
        console.error('Error al obtener indicadores del extractor:', error);
        return [];
    }
};

/**
 * Detalle de cada indicador del módulo Extractor, sacado del mapeo: título,
 * periodicidad, si es de corte o mensual, cómo agrupa, de dónde sale el
 * denominador y qué archivos usa (SUI-13, Egresos) y para qué.
 * @returns {Promise<Array<{indicador:string, categoria:string, titulo:string, periodicidad:string,
 *   descripcionPeriodicidad:string|null, tipo:'corte'|'mensual', agrupacion:string, denominador:string,
 *   archivos:Array<{archivo:string, requerido:boolean, uso:string}>}>>}
 */
export const getDetalleIndicadoresExtractor = async () => {
    const { data } = await api.get('/Indicadores/extractor/indicadores/detalle');
    return data.data ?? [];
};

/**
 * Consulta, para un año de referencia, cuántos de los 12 meses de cada
 * ventana (corte Junio del año, corte Diciembre del año, y corte Junio del
 * año siguiente) ya están subidos. Un mes cuenta como subido solo cuando ya
 * quedó guardado para TODOS los indicadores del extractor a la vez.
 * @param {string|number} anio - Año de referencia
 * @returns {Promise<Object|null>} Objeto indexado por "Junio 2026", "Diciembre 2026", etc.
 */
export const getEstadoExtractor = async (anio) => {
    try {
        const { data } = await api.get('/Indicadores/extractor/estado', { params: { anio } });
        return data.data ?? null;
    } catch (error) {
        console.error('Error al obtener el estado del extractor:', error);
        return null;
    }
};

/**
 * Por cada archivo que usa el Extractor (SUI-13, Egresos, ...) y cada mes del año:
 * su estado ("completo", "parcial", "pendiente", "sin_principal", "sin_registro"),
 * a qué indicadores alimenta y para qué se usa.
 * @param {number} anio
 * @returns {Promise<{anio:number, archivos:Array<{archivo:string, prefijoArchivo:string, tipo:'principal'|'cruce',
 *   requerido:boolean, uso:string, indicadores:string[], meses:Array<{mes:string, estado:string, faltan?:string[]}>}>}|null>}
 */
export const getEstadoArchivosExtractor = async (anio) => {
    try {
        const { data } = await api.get('/Indicadores/extractor/estado-archivos', { params: { anio } });
        return data.data ?? null;
    } catch (error) {
        console.error('Error al obtener el estado de archivos del extractor:', error);
        return null;
    }
};

/**
 * Sube solo el archivo de cruce (Egresos) de un mes: completa la vía 2 de los
 * indicadores que lo usan, con lo que dejó el SUI-13 de ese mes.
 * @param {number} anio
 * @param {string} mes - "Enero".."Diciembre"
 * @param {File} archivo - EGRESOS_PACIENTES_DIARIA_MM_AAAA.xlsx
 */
export const subirCruceExtractor = async (anio, mes, archivo) => {
    const form = new FormData();
    form.append('anio', anio);
    form.append('mes', mes);
    form.append('archivo', archivo);
    form.append('pesoArchivo', archivo.size);
    const { data } = await api.post('/Indicadores/extractor/subir-cruce', form);
    return data;
};

/**
 * Sube el Excel crudo de un mes (SUI-13) -- y opcionalmente el de cruce
 * (Egresos, para validar la vía 2) -- y lo procesa para TODOS los
 * indicadores del módulo Extractor a la vez (EH 03 y DM 04 por ahora).
 * @param {string|number} anio - Año del mes que se sube
 * @param {string} mes - Nombre del mes en español ("Enero".."Diciembre")
 * @param {File} archivo - Excel principal (SUI_13_MM_AAAA.xlsx)
 * @param {File|null} archivoCruce - Excel de cruce (EGRESOS_PACIENTES_DIARIA_MM_AAAA.xlsx)
 * @returns {Promise<Object>} Resultado por indicador (numerador por unidad, si se generó el corte)
 */
export const subirArchivoMensualExtractor = async (anio, mes, archivo, archivoCruce = null, archivoBase = 'SUI_13') => {
    const form = new FormData();
    form.append('anio', anio);
    form.append('mes', mes);
    form.append('archivo', archivo);
    form.append('pesoArchivo', archivo.size);
    form.append('archivoBase', archivoBase);   // qué archivo es (SUI_13, EGRESOS_TOCO...): decide qué indicadores se procesan
    if (archivoCruce) {
        form.append('archivoCruce', archivoCruce);
        form.append('pesoArchivoCruce', archivoCruce.size);
    }
    const { data } = await api.post('/Indicadores/extractor/subir', form);
    return data;
};
