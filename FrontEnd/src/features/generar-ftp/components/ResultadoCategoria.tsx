// propios
import { IconoAlerta, IconoPalomita } from '@/components/icons';

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
            <IconoPalomita tamano={11} strokeWidth="3" />
            {resultado.completados.length} generados correctamente
          </span>
          {conErrores > 0 && onVerRestricciones && (
            <button className="ind-batch-err ind-batch-err--btn" onClick={onVerRestricciones}>
              <IconoAlerta tamano={10} />
              {conErrores} con errores · ver detalle
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default ResultadoCategoria;
