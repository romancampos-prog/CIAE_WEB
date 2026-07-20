import { useState } from 'react';
import { COLOR_SEMAFORO } from '../../constantes/semaforo';

const ORDEN = ['Esperado', 'Medio', 'Bajo', 'Gris'];
const DURACION_VOLTEO = 260; // ms — debe coincidir con la transición de .ig-kpi-items--volteando

/**
 * Franja de KPIs por color de semáforo — "Unidades" aparece una sola vez a un lado
 * (no repetido por color), cada color es un segmento angosto con su punto de color.
 * Gris solo aparece si de verdad hay unidades en Gris ese momento.
 *
 * Clickeable: seleccionar un color filtra la vista a solo esas unidades; click de
 * nuevo sobre el mismo color quita el filtro. Click sobre la etiqueta "Unidades" quita
 * el filtro y voltea TODA la fila de tarjetas (rotación vertical) — al terminar el
 * volteo se ve solo el umbral de cada color, sin número ni porcentaje.
 *
 * Props:
 *   conteo        — { Esperado, Medio, Bajo, Gris } | null
 *   colorActivo   — color actualmente filtrado, o null
 *   onSelectColor — fn(color) — se llama con el color clickeado (o null si se repite o se limpia)
 *   rangos        — { Esperado, Medio, Bajo } | null — texto del umbral de cada color
 */
const CumplimientoTile = ({ conteo, colorActivo, onSelectColor, rangos }) => {
  const [volteado, setVolteado]   = useState(false);
  const [volteando, setVolteando] = useState(false);
  if (!conteo) return null;

  const total = ORDEN.reduce((s, k) => s + (conteo[k] ?? 0), 0);
  if (total === 0) return null;

  // Gris no tiene umbral -- en la vista volteada nunca se muestra, ni aunque haya
  // unidades en gris. En la vista normal sí, pero solo si de verdad hay alguna.
  const colores = volteado
    ? ORDEN.filter(c => c !== 'Gris')
    : ORDEN.filter(c => c !== 'Gris' || (conteo.Gris ?? 0) > 0);

  const clickeable = typeof onSelectColor === 'function';

  const handleTitulo = () => {
    if (clickeable) onSelectColor(null);
    setVolteando(true);
    setTimeout(() => {
      setVolteado(v => !v);
      setVolteando(false);
    }, DURACION_VOLTEO);
  };

  return (
    <div className="ig-kpi-strip">
      <span
        className="ig-kpi-titulo ig-kpi-titulo--clickeable"
        onClick={handleTitulo}
        title={volteado ? 'Ver conteo de unidades' : 'Ver umbrales'}
      >
        {volteado ? 'Umbrales' : 'Unidades'}
      </span>
      <div className={`ig-kpi-items${volteando ? ' ig-kpi-items--volteando' : ''}`}>
        {colores.map(color => {
          const n      = conteo[color] ?? 0;
          const pct    = Math.round((n / total) * 100);
          const activo = colorActivo === color;
          const umbral = color !== 'Gris' ? (rangos?.[color] ?? 'Sin umbral') : 'Sin umbral';
          return (
            <div
              key={color}
              className={`ig-kpi-item${clickeable ? ' ig-kpi-item--clickeable' : ''}${activo ? ' ig-kpi-item--activo' : ''}`}
              style={{ '--status': COLOR_SEMAFORO[color] }}
              onClick={clickeable ? () => onSelectColor(activo ? null : color) : undefined}
            >
              {volteado ? (
                <span className="ig-kpi-umbral">{umbral}</span>
              ) : (
                <>
                  <span className="ig-kpi-dot" />
                  <span className="ig-kpi-num">{n}</span>
                  <span className="ig-kpi-pct">{pct}%</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CumplimientoTile;
