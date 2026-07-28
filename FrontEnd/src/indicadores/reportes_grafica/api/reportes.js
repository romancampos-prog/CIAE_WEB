import api from '../../../shared/api/axiosInstance';

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

/**
 * Variante de solo lectura de getReporte -- para descargar desde gráficas.
 * Nunca extrae de FTP ni guarda nada (nunca cierra un mes ni pisa el semanal):
 * solo trae lo que el indicador ya tenga guardado para ese mes.
 */
export const getReporteGuardado = async (indicador, datos) => {
    try {
        const respuesta = await api.get('/reportes/Indicadores/guardado', {
            params: { indicador, ano: datos.ano, mes: datos.mes }
        });
        return respuesta.data;
    } catch (error) {
        console.error('Error al obtener reporte guardado:', error);
        throw error;
    }
};

/** Variante de solo lectura de generarCategoria -- para "descargar todos" desde gráficas. */
export const generarCategoriaGuardada = async (categoria, datos) => {
    try {
        const respuesta = await api.get('/reportes/generar-categoria/guardado', {
            params: { categoria, ano: datos.ano, mes: datos.mes }
        });
        return respuesta.data;
    } catch (error) {
        console.error('Error al obtener categoría guardada:', error);
        throw error;
    }
};

/** Regenera un mes definitivo que ya tiene reporte guardado (requiere contraseña). */
export const regenerarReporteFinal = async (indicador, datos, password) => {
    const respuesta = await api.post('/reportes/Indicadores/regenerar', {
        indicador,
        ano: datos.ano,
        mes: datos.mes,
        password,
    });
    return respuesta.data;
};

/** Regenera toda una categoría cuyo mes definitivo ya fue generado (requiere contraseña). */
export const regenerarCategoria = async (categoria, datos, password) => {
    const respuesta = await api.post('/reportes/generar-categoria/regenerar', {
        categoria,
        ano: datos.ano,
        mes: datos.mes,
        password,
    });
    return respuesta.data;
};
