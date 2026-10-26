interface Props {
  indicadores: string[];
  color: string;
  resultado: { completados: string[]; errores: Record<string, unknown> } | null;
  /** Solo si hay restricciones que mostrar. */
  onVerRestricciones?: () => void;
}

/** Los indicadores de la categoría con ✓/✗ después de "Generar todos" y el resumen. */
const ResultadoCategoria = ({ indicadores, color, resultado, onVerRestricciones }: Props) => {
  const conErrores = Object.keys(resultado?.errores ?? {}).length;
  return (
    <>
      <div className="ind-batch-ind-list">
        {indicadores.map(ind => (
          <div key={ind} className="ind-batch-ind-row">
            <span className="ind-batch-ind-dot" style={{ background: color }} />
            <span className="ind-batch-ind-name">{ind}</span>
            {resultado?.completados.includes(ind) && <span className="ind-batch-ind-ok">✓</span>}
            {resultado?.errores[ind] != null && <span className="ind-batch-ind-err">✗</span>}
          </div>
        ))}
      </div>

      {resultado && (
        <div className="ind-batch-summary">
          <span className="ind-batch-ok">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {resultado.completados.length} generados correctamente
          </span>
          {conErrores > 0 && onVerRestricciones && (
            <button className="ind-batch-err ind-batch-err--btn" onClick={onVerRestricciones}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              {conErrores} con errores · ver detalle
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default ResultadoCategoria;
