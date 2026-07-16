import { COLOR_SEMAFORO } from '../../constantes/semaforo';

const ORDEN = ['Verde', 'Amarillo', 'Rojo', 'Gris'];

/**
 * Conteo compacto de unidades por color de semáforo (Verde/Amarillo/Rojo/Gris).
 * Complementa al TOTAL: uno dice "cuánto", este dice "qué tan parejo".
 *
 * Props:
 *   conteo — { Verde, Amarillo, Rojo, Gris } | null
 */
const CumplimientoTile = ({ conteo }) => {
  if (!conteo) return null;
  const total = ORDEN.reduce((s, k) => s + (conteo[k] ?? 0), 0);
  if (total === 0) return null;

  return (
    <div className="ig-cumplimiento">
      {ORDEN.map(color => (
        <span key={color} className="ig-cumplimiento-item">
          <span className="ig-cumplimiento-dot" style={{ background: COLOR_SEMAFORO[color] }} />
          <span className="ig-cumplimiento-num">{conteo[color] ?? 0}</span>
        </span>
      ))}
    </div>
  );
};

export default CumplimientoTile;
