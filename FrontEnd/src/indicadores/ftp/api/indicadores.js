import api from '../../../shared/api/axiosInstance';

/**
 * Indicadores que se generan en FTP, con lo común del mapeo (familia, título, periodicidad,
 * ícono y color de su familia) y los reportes SIAIS que lee cada uno.
 * @returns {Promise<Array<{indicador:string, categoria:string, nombreCategoria:string, titulo:string,
 *   periodicidad:string, imagen:string, color:string, reportes:string[]}>>}
 */
export const getIndicadoresFTP = async () => {
    const { data } = await api.get('/Indicadores/ftp/indicadores');
    return data.data ?? [];
};
