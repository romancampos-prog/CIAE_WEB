/**
 * Botones de selección de vista (Por unidad / Por mes / Acumulado).
 *
 * Props:
 *   vistas    — array { id, label, path }  — definición de cada botón
 *   actual    — string                     — id activo
 *   onChange  — fn(id)
 *   color     — string                     — indColor para el botón activo
 */
const VistaToggle = ({ vistas, actual, onChange, color }) => (
  <div className="ig-vista-toggle">
    {vistas.map(({ id, label, path }) => (
      <button
        key={id}
        className={`ig-vista-btn${actual === id ? ' ig-vista-btn--active' : ''}`}
        style={actual === id ? { '--vc': color } : {}}
        onClick={() => onChange(id)}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {path}
        </svg>
        {label}
      </button>
    ))}
  </div>
);

export default VistaToggle;
