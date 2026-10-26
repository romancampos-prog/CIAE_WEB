interface Props {
  meses: string[];
  /** true después del primer clic: el siguiente genera de todas formas. */
  confirmando: boolean;
}

/** Meses anteriores sin reporte final: se avisa antes de generar con el historial incompleto. */
const AvisoMesesFaltantes = ({ meses, confirmando }: Props) => (
  <div
    className="cfg-warning"
    style={confirmando ? {
      background: 'rgba(234,88,12,0.1)',
      borderColor: '#ea580c',
      boxShadow: '0 0 0 3px rgba(234,88,12,0.15)',
    } : undefined}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={confirmando ? '#ea580c' : 'currentColor'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
    <div>
      <strong style={confirmando ? { color: '#ea580c' } : {}}>
        {confirmando ? '¿Generar sin estos meses?' : 'Meses pendientes:'}
      </strong>{' '}
      {meses.join(', ')}
      <p>
        {confirmando
          ? 'El historial quedará incompleto. Haz clic de nuevo para confirmar.'
          : 'Généralos primero para tener el historial completo.'}
      </p>
    </div>
  </div>
);

export default AvisoMesesFaltantes;
