import api from '../../shared/api/axiosInstance';

export const EditInfoGeneral = async (datos, indicador) => {
    try {
        const response = await api.post('/reportes/editar/InfoGeneral', {
            id_indicador: indicador,
            ...datos
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const EditSemaforo = async (datos, indicador) => {
    try {
        const response = await api.post('/reportes/editar/infoSemaforo', {
            id_indicador: indicador,
            semaforo:     datos.semaforo
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const EditInfoTecnica = async (datos, indicador) => {
    try {
        const response = await api.post('/reportes/editar/infoTecnica', {
            id_indicador: indicador,
            ...datos
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};
