// propios
import type { ConteoValor, EstadisticasExtraccion } from '@/types/api/epidemiologia/ftp';

interface Props {
  estadisticas: EstadisticasExtraccion;
  claveActiva: string;
  onClave: (clave: string) => void;
  unidadActiva: string;
  onUnidad: (unidad: string) => void;
}

interface PropsBarras {
  titulo: string;
  conteos: ConteoValor[];
  activo: string;
  onElegir?: (valor: string) => void;
}

/** Barras de un conteo; con onElegir, un clic filtra la tabla por ese valor (otro clic lo quita). */
function BarrasConteo({ titulo, conteos, activo, onElegir }: PropsBarras) {
  const maximo = Math.max(1, ...conteos.map(c => c.cantidad));

  return (
    <section className="acc-tarjeta">
      <h3 className="acc-tarjeta-titulo">{titulo}</h3>
      <div className="acc-barras">
        {conteos.map(({ valor, cantidad }) => {
          const texto = valor ?? '(vacío)';
          const elegido = activo === texto;
          return (
            <button
              key={texto}
              className={`acc-barra${elegido ? ' acc-barra--activa' : ''}`}
              onClick={() => onElegir?.(elegido ? '' : texto)}
              disabled={!onElegir}
              title={`${texto}: ${cantidad}`}
            >
              <span className="acc-barra-texto">{texto}</span>
              <span className="acc-barra-pista"><span className="acc-barra-relleno" style={{ width: `${(cantidad / maximo) * 100}%` }} /></span>
              <span className="acc-barra-cantidad">{cantidad}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}


/** Totales y conteos que manda el backend (por la columna del filtro del mapeo y por unidad). */
export default function EstadisticasAcciones({ estadisticas, claveActiva, onClave, unidadActiva, onUnidad }: Props) {
  return (
    <>
      <div className="acc-kpis">
        <div className="acc-tarjeta acc-kpi">
          <span className="acc-kpi-valor">{estadisticas.totalRegistros}</span>
          <span className="acc-kpi-texto">Registros</span>
        </div>
        <div className="acc-tarjeta acc-kpi">
          <span className="acc-kpi-valor">{estadisticas.unidadesConRegistros}</span>
          <span className="acc-kpi-texto">Unidades con registros</span>
        </div>
      </div>

      {estadisticas.porColumna.map((c, i) => (
        // Solo la primera columna del filtro tiene filtro en la tabla.
        <BarrasConteo key={c.columna} titulo={`Por ${c.columna}`} conteos={c.conteos}
          activo={i === 0 ? claveActiva : ''} onElegir={i === 0 ? onClave : undefined} />
      ))}

      {estadisticas.porUnidad.length > 1 && (
        <BarrasConteo titulo="Por unidad" conteos={estadisticas.porUnidad} activo={unidadActiva} onElegir={onUnidad} />
      )}
    </>
  );
}
