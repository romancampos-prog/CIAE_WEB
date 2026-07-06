import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth_login } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import logo_imss from '../../assets/logo_imms.png';
import "./auth.css";

const IconUser = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconLock = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const IconEye = ({ open }) => open ? (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const Login = () => {
  const [credentials, setCredentials] = useState({ usuario: '', contrasena: '' });
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) =>
    setCredentials({ ...credentials, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await auth_login(credentials);
      if (data.success) {
        login({ user: data.data.usuario, token: data.data.token });
        const destinos = {
          trabajador_IAAS: '/CIAE/IndicadoresMedicos/IASS',
          ftp:             '/CIAE/IndicadoresMedicos/FTP',
        };
        const payload = JSON.parse(atob(data.data.token.split('.')[1]));
        const destino = destinos[payload?.rol] ?? '/CIAE/Inicio';
        setTimeout(() => navigate(destino), 600);
      }
    } catch (err) {
      setError(err.message || 'Error de acceso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cl-root">

      {/* ══════════════ PANEL IZQUIERDO ══════════════ */}
      <div className="cl-left">

        {/* Fondo animado */}
        <div className="cl-left-bg" aria-hidden="true">
          <div className="cl-blob cl-blob-a" />
          <div className="cl-blob cl-blob-b" />
          <div className="cl-blob cl-blob-c" />
          <div className="cl-dots" />
          <div className="cl-ring cl-ring-1" />
          <div className="cl-ring cl-ring-2" />
          <div className="cl-ring cl-ring-3" />
          <div className="cl-sweep" />
        </div>

        {/* Contenido */}
        <div className="cl-left-body">

          <img src={logo_imss} alt="IMSS" className="cl-logo" />

          <div className="cl-divider" />

          <p className="cl-eyebrow">Sistema Institucional</p>
          <h1 className="cl-brand">
            {['C','I','A','E'].map((l, i) => (
              <span
                key={l}
                className="cl-letter"
                style={{ animationDelay: `${0.42 + i * 0.12}s, ${1.05 + i * 0.32}s, ${1.05 + i * 0.32}s` }}
              >{l}</span>
            ))}
          </h1>
          <p className="cl-brand-sub">
            Coordinación de Información<br />y Análisis Estratégico
          </p>

        </div>

        <div className="cl-left-footer">
          <span className="cl-status-dot" />
        </div>
      </div>

      {/* ══════════════ PANEL DERECHO ══════════════ */}
      <div className="cl-right">

        {/* barra superior tricolor */}
        <div className="cl-topbar" aria-hidden="true" />

        {/* decos fondo */}
        <div className="cl-right-deco" aria-hidden="true">
          <div className="cl-rdeco-blob cl-rdeco-1" />
          <div className="cl-rdeco-blob cl-rdeco-2" />
          <div className="cl-rdeco-circle" />
        </div>

        <div className="cl-form-wrap">

          {/* Encabezado form */}
          <div className="cl-form-header">
            <h2 className="cl-form-title">Iniciar sesión</h2>
            <p className="cl-form-hint">Ingrese sus credenciales para continuar</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="cl-form" noValidate>

            {/* Usuario */}
            <div className="cl-field">
              <label className="cl-label">Usuario</label>
              <div className="cl-input-wrap">
                <span className="cl-icon cl-icon-left"><IconUser /></span>
                <input
                  type="text"
                  name="usuario"
                  className="cl-input"
                  placeholder="Usuario institucional"
                  value={credentials.usuario}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="cl-field">
              <label className="cl-label">Contraseña</label>
              <div className="cl-input-wrap">
                <span className="cl-icon cl-icon-left"><IconLock /></span>
                <input
                  type={verPassword ? 'text' : 'password'}
                  name="contrasena"
                  className="cl-input"
                  placeholder="••••••••••"
                  value={credentials.contrasena}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="cl-eye-btn"
                  onClick={() => setVerPassword(v => !v)}
                  tabIndex={-1}
                >
                  <IconEye open={verPassword} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="cl-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Botón */}
            <button type="submit" className="cl-btn" disabled={loading}>
              <span className="cl-btn-shimmer" />
              <span className="cl-btn-label">
                {loading
                  ? <span className="cl-spinner" />
                  : <><span>Ingresar al sistema</span><span className="cl-arrow">→</span></>
                }
              </span>
            </button>

          </form>

          {/* Pie */}

        </div>
      </div>

    </div>
  );
};

export default Login;
