/** Roles que maneja el backend (BackEnd/.env); `solo_roles(...)` los revisa en cada endpoint. */
export type Rol = 'admin' | 'trabajador_ftp' | 'trabajador_IAAS' | 'visitante';

export interface Sesion {
  user: string;
  rol: Rol;
}

export interface CredencialesLogin {
  usuario: string;
  contrasena: string;
}

/** `data` de /auth/login y /auth/me. */
export interface UsuarioBackend {
  usuario: string;
  rol: Rol;
}
