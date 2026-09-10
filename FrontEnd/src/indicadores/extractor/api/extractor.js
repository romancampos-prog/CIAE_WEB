import api from '../../../shared/api/axiosInstance';

/**
 * Consulta la lista de indicadores que vive en el módulo Extractor
 * (los que usan el motor "extractor" / FILTRO_CONTEO_ACUMULADO en el mapeo).
 * @returns {Promise<string[]>} ej. ["EH 03", "DM 04"]
 */
export const getIndicadoresExtractor = async () => {
    try {
        const { data } = await api.get('/extractor/indicadores');
        return data.data ?? [];
    } catch (error) {
        console.error('Error al obtener indicadores del extractor:', error);
        return [];
    }
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
        const { data } = await api.get('/extractor/estado', { params: { anio } });
        return data.data ?? null;
    } catch (error) {
        console.error('Error al obtener el estado del extractor:', error);
        return null;
    }
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
export const subirArchivoMensualExtractor = async (anio, mes, archivo, archivoCruce = null) => {
    const form = new FormData();
    form.append('anio', anio);
    form.append('mes', mes);
    form.append('archivo', archivo);
    form.append('pesoArchivo', archivo.size);
    if (archivoCruce) {
        form.append('archivoCruce', archivoCruce);
        form.append('pesoArchivoCruce', archivoCruce.size);
    }
    const { data } = await api.post('/extractor/subir', form);
    return data;
};
