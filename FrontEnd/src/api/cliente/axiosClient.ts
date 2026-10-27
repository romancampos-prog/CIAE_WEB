// propios
import axios from 'axios';
import { URL_API } from '@/config/env';

// withCredentials: el navegador manda solo la cookie httpOnly del token (JWT). El JS no puede
// leerla a propósito, por eso aquí no se arma ningún header Authorization.
const api = axios.create({ baseURL: URL_API, withCredentials: true });

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // /auth/me responde 401 cuando simplemente no hay sesión (p. ej. parado en el login):
    // si se tratara igual que los demás 401, la página se recargaría en bucle.
    if (axios.isAxiosError(error)) {
      const esCheckDeSesion = error.config?.url?.includes('/auth/me');
      if (error.response?.status === 401 && !esCheckDeSesion) {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
