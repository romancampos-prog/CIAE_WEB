import api from '../../shared/api/axiosInstance';

export const subirArchivoPoblacion = async (archivo) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    const respuesta = await api.post('/ftp/poblacion/subir', formData);
    return respuesta.data;
};

export const recalcularPoblacion = async (ano = '2026') => {
    const respuesta = await api.post('/reportes/recalcular-poblacion', { ano });
    return respuesta.data;
};
