import axios from 'axios';
import { urlGlobal } from './URL.JS';

// withCredentials: true -> el navegador manda la cookie httpOnly del token sola,
// ya no hace falta leer nada de localStorage ni armar el header a mano.
const api = axios.create({ baseURL: urlGlobal, withCredentials: true });

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // /auth/me responde 401 cuando simplemente no hay sesion activa —
        // eso es normal (ej. parado en la pagina de login), no un error que
        // deba recargar la pagina. Si lo tratamos igual, se hace un bucle
        // infinito de recargas.
        const esCheckDeSesion = error.config?.url?.includes('/auth/me');
        if (error.response?.status === 401 && !esCheckDeSesion) {
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;
