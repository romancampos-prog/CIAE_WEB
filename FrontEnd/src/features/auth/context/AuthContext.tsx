// react
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
// propios
import type { Sesion } from '@/types/pantallas/auth';
import { authApi } from '@/api/auth/authApi';

interface ValorAuth {
  user: Sesion | null;
  loading: boolean;
  login: (sesion: Sesion) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<ValorAuth | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Sesion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.quienSoy()
      .then(({ usuario, rol }) => setUser({ user: usuario, rol }))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = (sesion: Sesion) => setUser(sesion);

  const logout = async () => {
    try {
      await authApi.cerrarSesion();
    } catch {
      // aunque falle la llamada al backend, igual se limpia la sesión local
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): ValorAuth => {
  const valor = useContext(AuthContext);
  if (!valor) throw new Error('useAuth se usa dentro de <AuthProvider>');
  return valor;
};
