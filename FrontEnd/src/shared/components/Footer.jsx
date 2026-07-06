import './footer.css';

const Footer = () => (
  <footer className="cf-root">
    <div className="cf-accent" />
    <div className="cf-inner">

      <div className="cf-left">
        <span className="cf-pulse" />
        <strong className="cf-brand">CIAE</strong>
        <span className="cf-pipe" />
        <span className="cf-tagline">Coordinación de Información y Análisis Estratégico</span>
      </div>

      <div className="cf-right">
        <span className="cf-dev">Desarrollo · R.G. Campos Barraza &amp; L.V. López Hernández</span>
        <span className="cf-dot">·</span>
        <span className="cf-copy">© 2026 IMSS · León, Gto.</span>
      </div>

    </div>
  </footer>
);

export default Footer;
