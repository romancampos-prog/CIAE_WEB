import api from '@shared/api/axiosInstance';

export const getAllIndicadores = async () => {
    try {
        const respuesta = await api.get('/ftp/todos');
        return respuesta.data;
    } catch (error) {
        console.error('Error al traer todos los indicadores', error);
        throw error;
    }
};

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
