// Endpoints de /auth (auth/controllers/auth_controller.py).

// propios
import api from '@/api/cliente/axiosClient';
import type { CredencialesLogin, UsuarioBackend } from '@/types/api/auth';
import type { RespuestaApi } from '@/types/api/respuestaApi';

export const authApi = {
  async iniciarSesion(credenciales: CredencialesLogin): Promise<UsuarioBackend> {
    const { data } = await api.post<RespuestaApi<UsuarioBackend>>('/auth/login', credenciales);
    return data.data;
  },

  /** Con la cookie httpOnly el front no puede leer el token: se le pregunta al backend quién es. */
  async quienSoy(): Promise<UsuarioBackend> {
    const { data } = await api.get<RespuestaApi<UsuarioBackend>>('/auth/me');
    return data.data;
  },

  async cerrarSesion(): Promise<void> {
    await api.post('/auth/logout');
  },
};
