// react
import type { ChangeEvent, FormEvent } from 'react';
// propios
import type { CredencialesLogin } from '@/features/auth/tipos';

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

const IconEye = ({ open }: { open: boolean }) => open ? (
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

interface Props {
  credenciales: CredencialesLogin;
  cambiarCampo: (e: ChangeEvent<HTMLInputElement>) => void;
  enviar: (e: FormEvent<HTMLFormElement>) => void;
  verContrasena: boolean;
  alternarVerContrasena: () => void;
  entrando: boolean;
  error: string;
}

/** Formulario de usuario/contraseña (los estilos cl-* están en pages/login/login.css). */
const FormularioLogin = ({ credenciales, cambiarCampo, enviar, verContrasena, alternarVerContrasena, entrando, error }: Props) => (
  <div className="cl-form-wrap">

    <div className="cl-form-header">
      <h2 className="cl-form-title">Iniciar sesión</h2>
      <p className="cl-form-hint">Ingrese sus credenciales para continuar</p>
    </div>

    <form onSubmit={enviar} className="cl-form" noValidate>

      <div className="cl-field">
        <label className="cl-label">Usuario</label>
        <div className="cl-input-wrap">
          <span className="cl-icon cl-icon-left"><IconUser /></span>
          <input
            type="text"
            name="usuario"
            className="cl-input"
            placeholder="Usuario institucional"
            value={credenciales.usuario}
            onChange={cambiarCampo}
            required
            autoComplete="username"
          />
        </div>
      </div>

      <div className="cl-field">
        <label className="cl-label">Contraseña</label>
        <div className="cl-input-wrap">
          <span className="cl-icon cl-icon-left"><IconLock /></span>
          <input
            type={verContrasena ? 'text' : 'password'}
            name="contrasena"
            className="cl-input"
            placeholder="••••••••••"
            value={credenciales.contrasena}
            onChange={cambiarCampo}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            className="cl-eye-btn"
            onClick={alternarVerContrasena}
            tabIndex={-1}
          >
            <IconEye open={verContrasena} />
          </button>
        </div>
      </div>

      {error && (
        <div className="cl-error" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      <button type="submit" className="cl-btn" disabled={entrando}>
        <span className="cl-btn-shimmer" />
        <span className="cl-btn-label">
          {entrando
            ? <span className="cl-spinner" />
            : <><span>Ingresar al sistema</span><span className="cl-arrow">→</span></>
          }
        </span>
      </button>

    </form>

  </div>
);

export default FormularioLogin;
