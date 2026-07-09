const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

/**
 * Tarjeta de navegación reutilizable.
 *
 * Props:
 *   titulo       — string         — nombre principal de la card
 *   eyebrow      — string         — etiqueta pequeña arriba del título
 *   desc         — string         — párrafo descriptivo
 *   chips        — string[]       — etiquetas del footer
 *   color        — 'green' | 'gold' | 'tinto'
 *   onClick      — fn             — navegación al hacer click
 *   disabled     — bool           — bloquea clicks y opaca la card
 *   disabledMsg  — string         — chip extra cuando disabled (default 'Sin permiso')
 *   children     — ReactNode      — icono SVG dentro de la card
 */
const NavCard = ({
  titulo,
  eyebrow,
  desc,
  chips = [],
  color = 'green',
  onClick,
  disabled = false,
  disabledMsg = 'Sin permiso',
  children,
}) => {
  const arrowColor = disabled ? 'disabled' : color === 'tinto' ? 'tinto' : 'green';

  return (
    <div
      className={`home-card${disabled ? ' home-card--disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
      title={disabled ? 'No tienes permiso para esta sección' : undefined}
    >
      <div className={`hc-header hc-header--${color}`}>
        <div className={`hc-icon-box hc-icon-box--${color}`}>
          {children}
        </div>
        <div className="hc-header-text">
          <p className="hc-eyebrow">{eyebrow}</p>
          <h2 className="hc-name">{titulo}</h2>
        </div>
      </div>

      <p className="hc-desc">{desc}</p>

      <div className="hc-footer">
        <div className="hc-chips">
          {chips.map(c => (
            <span key={c} className={`hc-chip hc-chip--${disabled ? 'muted' : color}`}>{c}</span>
          ))}
          {disabled && <span className="hc-chip hc-chip--muted">{disabledMsg}</span>}
        </div>
        <div className={`hc-arrow hc-arrow--${arrowColor}`}>
          <ArrowIcon />
        </div>
      </div>
    </div>
  );
};

export default NavCard;
