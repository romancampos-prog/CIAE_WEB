// API publica de la feature auth: lo unico que se puede usar fuera de features/auth/.
export { default as FormularioLogin } from './components/FormularioLogin';
export { AuthProvider, useAuth } from './context/AuthContext';
export { useLogin } from './hooks/useLogin';
export { useRol } from './hooks/useRol';
export type { Rol, Sesion } from './tipos';
