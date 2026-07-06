import api from '../../shared/api/axiosInstance';

export const getCanal             = ()     => api.get('/epidemiologia/reportes/canal');
export const getMapa              = (tipo) => api.get(`/epidemiologia/reportes/mapa/${tipo}`);
export const getAlertasSiscep     = ()     => api.get('/epidemiologia/reportes/alertas-siscep');
export const getDuplicados        = ()     => api.get('/epidemiologia/reportes/duplicados');
export const getPosiblesDuplicados = ()    => api.get('/epidemiologia/reportes/posibles-duplicados');
