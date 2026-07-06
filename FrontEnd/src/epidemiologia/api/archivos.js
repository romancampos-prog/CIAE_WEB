import api from '../../shared/api/axiosInstance';

export const subirOperativa = (archivo) => {
    const form = new FormData();
    form.append('archivo', archivo);
    return api.post('/epidemiologia/archivos/operativa', form);
};

export const subirSiscep = (archivo) => {
    const form = new FormData();
    form.append('archivo', archivo);
    return api.post('/epidemiologia/archivos/siscep', form);
};
