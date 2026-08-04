import { createContext, useState, useEffect, useContext } from 'react';
import api from '../../shared/api/axiosInstance';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // el token vive en una cookie httpOnly, no lo podemos leer aqui —
    // le preguntamos al backend "quien soy" para saber si hay sesion activa.
    const checkAuth = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser({ user: data.data.usuario, rol: data.data.rol });
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = (userData) => {
    setUser({ user: userData.user, rol: userData.rol });
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // aunque falle la llamada al backend, igual limpiamos la sesion local
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);