// Lo que responde src/api/auth/authApi.ts (copia de los modelos del backend).

/**
 * Roles que maneja el backend (BackEnd/.env y BD_CIAE/USUARIOS); `solo_roles(...)` los revisa en
 * cada endpoint. `unidad` = usuario de un hospital/UMF: el backend solo le manda su unidad.
 */
export type Rol = 'admin' | 'trabajador_ftp' | 'trabajador_IAAS' | 'visitante' | 'unidad';

export interface CredencialesLogin {
  usuario: string;
  contrasena: string;
}

/** `data` de /auth/login y /auth/me. */
export interface UsuarioBackend {
  usuario: string;
  rol: Rol;
}
