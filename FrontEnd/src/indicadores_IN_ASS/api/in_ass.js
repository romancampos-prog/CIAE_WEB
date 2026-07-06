import api from '../../shared/api/axiosInstance';

const ENDPOINTS_ASS = {
    '01': '/reportes/ASS_PRUEBA',
    '02': '/reportes/ASS_02',
    '03': '/reportes/ASS_03',
    '04': '/reportes/ASS_04',
    '05': '/reportes/ASS_05',
    '06': '/reportes/ASS_06',
};

export const getIndicadoresInAss = async () => {
    try {
        const { data } = await api.get('/in-ass/indicadores');
        return data.data ?? [];
    } catch (error) {
        console.error('Error al obtener indicadores IN_ASS:', error);
        return [];
    }
};

export const getUnidadesInAss = async () => {
    try {
        const { data } = await api.get('/in-ass/unidades');
        return data.data ?? [];
    } catch (error) {
        console.error('Error al obtener unidades IN_ASS:', error);
        return [];
    }
};

export const infoBasicaInAass = async () => {
    const { data } = await api.get('/in-ass/info');
    return data;
};

export const generarIN_Ass = async (anio, mes, numerador, denominador, excel_denominador_inass_01) => {
    const form = new FormData();
    form.append('anio', anio);
    form.append('mes', mes);
    if (excel_denominador_inass_01) form.append('excel_denominador_inass_01', excel_denominador_inass_01);
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
    const { data } = await api.post('/reportes/InAss/Generar', form);
    return data;
};

export const getInAssDatosGrafica = async (anio) => {
    try {
        const { data } = await api.get('/reportes/InAss/datos-grafica', { params: { anio } });
        return data.data ?? { unidades: [], meses_con_datos: [], datos: {} };
    } catch {
        return { unidades: [], meses_con_datos: [], datos: {} };
    }
};

export const descargarInAssGuardado = async (anio) => {
    const { data } = await api.get('/reportes/InAss/descargar', { params: { anio } });
    return data.data ?? data;
};

export const getSesionInAss = async (anio, mes) => {
    try {
        const { data } = await api.get('/in-ass/sesion', { params: { anio, mes } });
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
    form.append('excel_unidad', excelFile);
    const { data } = await api.post('/in-ass/completar-unidad', form);
    return data;
};

export const getInAssMesesGuardados = async (anio) => {
    try {
        const { data } = await api.get('/reportes/InAss/meses-guardados', { params: { anio } });
        return data.data?.meses ?? [];
    } catch {
        return [];
    }
};

export const generarInAss = async (id) => {
    const endpoint = ENDPOINTS_ASS[id];
    if (!endpoint) throw new Error(`ID desconocido: ${id}`);
    const { data } = await api.get(endpoint);
    return data.data ?? data;
};
