import api from '../../../shared/api/axiosInstance';

export const getMesesGenerados = async (indicador, ano) => {
    try {
        const respuesta = await api.get('/Indicadores/ftp/meses-generados', {
            params: { indicador, ano }
        });
        return respuesta.data.data?.meses ?? [];
    } catch {
        return [];
    }
};

export const generarCategoria = async (categoria, datos) => {
    try {
        const respuesta = await api.post('/Indicadores/ftp/generar-categoria', {
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
        const respuesta = await api.get('/Indicadores/ftp/generar', {
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

/** Regenera un mes definitivo que ya tiene reporte guardado (requiere contraseña). */
export const regenerarReporteFinal = async (indicador, datos, password) => {
    const respuesta = await api.post('/Indicadores/ftp/regenerar', {
        indicador,
        ano: datos.ano,
        mes: datos.mes,
        password,
    });
    return respuesta.data;
};

/** Regenera toda una categoría cuyo mes definitivo ya fue generado (requiere contraseña). */
export const regenerarCategoria = async (categoria, datos, password) => {
    const respuesta = await api.post('/Indicadores/ftp/regenerar-categoria', {
        categoria,
        ano: datos.ano,
        mes: datos.mes,
        password,
    });
    return respuesta.data;
};
