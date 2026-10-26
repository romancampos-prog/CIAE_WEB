interface Props {
  pendientes: string[];
  mesNombre: string;
  anio: string;
  onAbrir: () => void;
}

/** Aviso fijo con las unidades pendientes del mes elegido; abre el modal de unidades tardías. */
const AvisoPendientesIaas = ({ pendientes, mesNombre, anio, onAbrir }: Props) => {
  if (!pendientes.length) return null;
  const plural = pendientes.length > 1;
  return (
    <button className="ia-toast-pendiente" onClick={onAbrir}>
      <div className="ia-toast-icon">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <div className="ia-toast-body">
        <strong>{pendientes.length} unidad{plural ? 'es' : ''} pendiente{plural ? 's' : ''}</strong>
        <span>{mesNombre} {anio}</span>
      </div>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
      </svg>
    </button>
  );
};

export default AvisoPendientesIaas;
