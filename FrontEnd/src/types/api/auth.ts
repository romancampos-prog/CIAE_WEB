// Lo que responde src/api/auth/authApi.ts (copia de los modelos del backend).

/** Roles que maneja el backend (BackEnd/.env); `solo_roles(...)` los revisa en cada endpoint. */
export type Rol = 'admin' | 'trabajador_ftp' | 'trabajador_IAAS' | 'visitante';

export interface CredencialesLogin {
  usuario: string;
  contrasena: string;
}

/** `data` de /auth/login y /auth/me. */
export interface UsuarioBackend {
  usuario: string;
  rol: Rol;
}
