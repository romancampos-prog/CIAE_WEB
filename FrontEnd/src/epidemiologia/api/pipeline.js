import api from '../../shared/api/axiosInstance';

export const getEstado = () => api.get('/epidemiologia/pipeline/estado');
export const ejecutar  = () => api.post('/epidemiologia/pipeline/ejecutar');
