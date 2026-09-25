import api from '../../../shared/api/axiosInstance';

/**
 * Excel de uno o varios indicadores (FTP, IAAS o Extractor), siempre armado desde
 * lo que ya esta guardado en la BD. Un solo indicador = un Excel individual; varios
 * = una pestaña por indicador.
 * @param {string[]} indicadores - ej. ["EH 03", "DM 04"]
 * @param {string|number} ano
 * @param {string|null} mes - "06" o "Junio"; sin mes trae el ultimo reporte de cada indicador
 * @returns {Promise<{archivo_b64:string, nombre_archivo:string, completados:string[], errores:Object}>}
 */
export const descargarExcelIndicadores = async (indicadores, ano, mes = null) => {
    // URLSearchParams para que la lista salga como indicadores=a&indicadores=b (axios usa indicadores[]=a)
    const params = new URLSearchParams();
    indicadores.forEach(indicador => params.append('indicadores', indicador));
    params.append('ano', ano);
    if (mes) params.append('mes', mes);
    const { data } = await api.get('/Indicadores/excel', { params });
    return data.data;
};
