// Lo que responde src/api/auth/authApi.ts (copia de los modelos del backend).

/**
 * Roles que maneja el backend (BackEnd/auth/services/roles_Services.py; usuarios en BD_CIAE/USUARIOS);
 * `solo_roles(...)` los revisa en cada endpoint.
 *   admin               todo
 *   edita_indicadores   genera indicadores; Epidemiología solo la ve
 *   edita_epidemiologia edita Epidemiología; Indicadores solo los ve
 *   edita_iaas          genera solo IAAS; lo demás solo lo ve
 *   unidad              hospital/UMF: el backend solo le manda su unidad
 */
export type Rol = 'admin' | 'edita_indicadores' | 'edita_epidemiologia' | 'edita_iaas' | 'unidad';

export interface CredencialesLogin {
  usuario: string;
  contrasena: string;
}

/** `data` de /auth/login y /auth/me. */
export interface UsuarioBackend {
  usuario: string;
  rol: Rol;
}
