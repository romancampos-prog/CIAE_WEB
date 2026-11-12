// propios
import { IconoAlerta, IconoError, IconoListaBarras, IconoPalomita, IconoTendencia } from '@/components/icons';
import { textoAcento } from '@/utils/colorAcento';

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

  const estadoDe = (indicador: string) => {
    const generado = resultado?.completados.includes(indicador);
    const fallo = resultado?.errores[indicador] != null;
    if (generado && fallo) return { texto: 'Generado con errores', tono: 'aviso', icono: <IconoAlerta tamano={12} /> };
    if (generado) return { texto: 'Generado', tono: 'ok', icono: <IconoPalomita tamano={11} strokeWidth="3" /> };
    return fallo ? { texto: 'Con errores', tono: 'error', icono: <IconoError tamano={12} /> } : null;
  };

  return (
    <>
      <p className="ind-gen-titulo"><IconoListaBarras tamano={13} /> Indicadores de la categoría</p>
      <div className="ind-batch-ind-list">
        {indicadores.map(ind => {
          const estado = estadoDe(ind);
          return (
            <div key={ind} className="ind-batch-ind-row">
              <span className="ind-batch-ind-icono" style={{ color: textoAcento(color) }} aria-hidden="true"><IconoTendencia tamano={16} /></span>
              <span className="ind-batch-ind-name">{ind}</span>
              {estado && <span className={`ind-batch-estado ind-batch-estado--${estado.tono}`}>{estado.icono} {estado.texto}</span>}
            </div>
          );
        })}
      </div>

      {resultado && (
        <div className="ind-batch-summary">
          <span className="ind-batch-ok">
            <IconoPalomita tamano={11} strokeWidth="3" />
            {resultado.completados.length} generados correctamente
          </span>
          {conErrores > 0 && onVerRestricciones && (
            <button className="ind-batch-err ind-batch-err--btn" onClick={onVerRestricciones}>
              <IconoAlerta tamano={14} />
              Ver lo que no se pudo generar
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default ResultadoCategoria;
