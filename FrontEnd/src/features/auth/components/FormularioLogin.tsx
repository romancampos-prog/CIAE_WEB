// react
import type { ChangeEvent, FormEvent } from 'react';
// propios
import type { CredencialesLogin } from '@/types/api/auth';
import { IconoCandado, IconoInfo, IconoOjo, IconoOjoTachado, IconoUsuario } from '@/components/icons';

const IconEye = ({ open }: { open: boolean }) => open ? (
  <IconoOjoTachado tamano={17} />
) : (
  <IconoOjo tamano={17} />
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
          <span className="cl-icon cl-icon-left"><IconoUsuario /></span>
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
          <span className="cl-icon cl-icon-left"><IconoCandado tamano={17} /></span>
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
          <IconoInfo />
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
