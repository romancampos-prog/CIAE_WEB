import api from '@shared/api/axiosInstance';

export const getMesesGenerados = async (indicador, ano) => {
    try {
        const respuesta = await api.get('/reportes/meses-generados', {
            params: { indicador, ano }
        });
        return respuesta.data.data?.meses ?? [];
    } catch {
        return [];
    }
};

export const generarCategoria = async (categoria, datos) => {
    try {
        const respuesta = await api.post('/reportes/generar-categoria', {
            categoria,
            ano:    datos.ano,
            mes:    datos.mes,
            semana: datos.semana ?? null,
        });
        return respuesta.data;
    } catch (error) {
        console.error('Error al generar categoría:', error);
        throw error;
    }
};

export const getReporte = async (indicador, datos) => {
    try {
        const respuesta = await api.get('/reportes/Indicadores', {
            params: {
                indicador,
                ano:    datos.ano,
                mes:    datos.mes,
                semana: datos.semana,
            }
        });
        return respuesta.data;
    } catch (error) {
        console.error('Error al generar reporte:', error);
        throw error;
    }
};
