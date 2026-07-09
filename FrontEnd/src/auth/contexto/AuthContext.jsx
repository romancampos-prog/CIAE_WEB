import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const savedToken = localStorage.getItem('token');
      if (!savedToken) { setLoading(false); return logout(); }

      const payload = decodeJwtPayload(savedToken);
      if (!payload) { setLoading(false); return logout(); }

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && now >= payload.exp) { setLoading(false); return logout(); }

      setUser({ token: savedToken, user: payload.sub, rol: payload.rol });
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = (userData) => {
    const payload = decodeJwtPayload(userData.token);
    localStorage.setItem('token', userData.token);
    const sessionData = { token: userData.token, user: userData.user, rol: payload?.rol || 'visor' };
    setUser(sessionData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);