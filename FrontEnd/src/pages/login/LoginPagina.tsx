// propios
import { FormularioLogin, useLogin } from '@/features/auth';
import BotonTema from '@/components/ui/BotonTema';
import logo_imss from '@/assets/logo_imms.png';
import "./login.css";

const LoginPagina = () => {
  const formulario = useLogin();

  return (
    <div className="cl-root">
      <BotonTema className="boton-tema--flotante" />

      {/* Fondo animado a pantalla completa — solo se muestra en mobile,
          para que todo (logo, marca y formulario) quede sobre un mismo
          panel verde continuo, sin corte visible entre secciones */}
      <div className="cl-mobile-bg" aria-hidden="true">
        <div className="cl-blob cl-blob-a" />
        <div className="cl-blob cl-blob-b" />
        <div className="cl-blob cl-blob-c" />
        <div className="cl-dots" />
        <div className="cl-ring cl-ring-1" />
        <div className="cl-ring cl-ring-2" />
        <div className="cl-ring cl-ring-3" />
        <div className="cl-sweep" />
      </div>

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
          <p className="cl-legal-footer">
            Este sitio web fue desarrollado de forma interna para apoyar el trabajo del área CIAE (Coordinación de Información y Análisis Estratégico), de acuerdo con sus necesidades operativas. La información aquí generada se utiliza como apoyo para la elaboración de reportes; su interpretación y uso posterior quedan a criterio de quien la consulta.
          </p>
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

        <FormularioLogin {...formulario} />

        {/* Pie legal — visible solo en mobile, anclado al fondo (ver .cl-legal-mobile en auth.css) */}
        <div className="cl-legal-mobile">
          <span className="cl-status-dot" />
          <p>
            Este sitio web fue desarrollado de forma interna para apoyar el trabajo del área CIAE (Coordinación de Información y Análisis Estratégico), de acuerdo con sus necesidades operativas. La información aquí generada se utiliza como apoyo para la elaboración de reportes; su interpretación y uso posterior quedan a criterio de quien la consulta.
          </p>
        </div>

      </div>

    </div>
  );
};

export default LoginPagina;
