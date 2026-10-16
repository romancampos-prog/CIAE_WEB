// react
import { useState } from 'react';
// propios
import { COLOR_SEMAFORO } from '../../constantes/semaforo';
import './estadisticas.css';

const VISIBLES = 8;
const formato = (valor) => (valor == null ? '—' : Number(valor).toLocaleString('es-MX', { maximumFractionDigits: 2 }));

/**
 * Cuántos casos le faltan (o le sobran) a cada unidad para llegar a Esperado con su
 * mismo denominador, en el mes de referencia. Calculado en el backend con la fórmula
 * y el semáforo del mapeo (estadisticas.brechas).
 *
 * Props:
 *   brechas         — [{ unidad, resultado, desempeno, meta, sentido: "faltan"|"sobran", casos }]
 *   mes             — "Julio"
 *   aplica          — false cuando la meta es un rango y no hay brecha que calcular
 *   onSelectUnidad  — fn(unidad)
 */
const BrechaMeta = ({ brechas = [], mes, aplica, onSelectUnidad }) => {
  const [verTodas, setVerTodas] = useState(false);
  const lista = verTodas ? brechas : brechas.slice(0, VISIBLES);
  const mayor = brechas[0]?.casos || 1;

  return (
    <section className="ige-tarjeta ige-brecha">
      <header className="ige-tarjeta-header">
        <h2 className="ige-tarjeta-titulo">Brecha a la meta · {mes}</h2>
        <p className="ige-tarjeta-sub">Casos que tendrían que cambiar en el numerador, con el mismo denominador, para que la unidad llegue a Esperado.</p>
      </header>

      {!aplica && <p className="ige-vacio">La meta de este indicador es un rango, así que no hay un número de casos que falte.</p>}
      {aplica && brechas.length === 0 && <p className="ige-vacio">Todas las unidades con dato están en Esperado este mes.</p>}

      {aplica && brechas.length > 0 && (
        <>
          <ol className="ige-brecha-lista">
            {lista.map(b => (
              <li key={b.unidad}>
                <button type="button" className="ige-brecha-fila" onClick={() => onSelectUnidad?.(b.unidad)}>
                  <span className="ige-brecha-unidad">{b.unidad}</span>
                  <span className="ige-brecha-actual">
                    <span className="ige-estado-punto" style={{ background: COLOR_SEMAFORO[b.desempeno] }} />
                    {formato(b.resultado)} <span className="ige-brecha-meta">meta {b.meta}</span>
                  </span>
                  <span className="ige-brecha-casos">
                    {b.sentido === 'faltan' ? 'Faltan' : 'Sobran'} <strong>{b.casos.toLocaleString('es-MX')}</strong>
                  </span>
                  <span className="ige-brecha-barra" aria-hidden>
                    <span style={{ width: `${Math.max(4, (b.casos / mayor) * 100)}%` }} />
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {brechas.length > VISIBLES && (
            <button type="button" className="ige-ver-todas" onClick={() => setVerTodas(v => !v)}>
              {verTodas ? 'Ver menos' : `Ver las ${brechas.length} unidades`}
            </button>
          )}
        </>
      )}
    </section>
  );
};

export default BrechaMeta;
