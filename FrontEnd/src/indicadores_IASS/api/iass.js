import api from '../../shared/api/axiosInstance';

export const getIndicadoresIASS = async () => {
    try {
        const { data } = await api.get('/iass/indicadores');
        return data.data ?? [];
    } catch (error) {
        console.error('Error al obtener indicadores IASS:', error);
        return [];
    }
};

export const getUnidadesIASS = async () => {
    try {
        const { data } = await api.get('/iass/unidades');
        return data.data ?? [];
    } catch (error) {
        console.error('Error al obtener unidades IASS:', error);
        return [];
    }
};

export const infoBasicaInAass = async () => {
    const { data } = await api.get('/iass/info');
    return data;
};

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

export const getIASSDatosGrafica = async (anio) => {
    try {
        const { data } = await api.get('/reportes/IASS/datos-grafica', { params: { anio } });
        return data.data ?? { unidades: [], meses_con_datos: [], datos: {} };
    } catch {
        return { unidades: [], meses_con_datos: [], datos: {} };
    }
};

export const descargarIASSGuardado = async (anio, indicador = null) => {
    const params = indicador ? { anio, indicador } : { anio };
    const { data } = await api.get('/reportes/IASS/descargar', { params });
    return data.data ?? data;
};

export const getSesionIASS = async (anio, mes) => {
    try {
        const { data } = await api.get('/iass/sesion', { params: { anio, mes } });
        return data.data ?? null;
    } catch {
        return null;
    }
};

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

export const getIASSMesesGuardados = async (anio) => {
    try {
        const { data } = await api.get('/reportes/IASS/meses-guardados', { params: { anio } });
        return data.data?.meses ?? [];
    } catch {
        return [];
    }
};
