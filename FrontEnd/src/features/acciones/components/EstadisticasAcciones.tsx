// propios
import type { ConteoValor, DescripcionClave, EstadisticasExtraccion } from '@/types/api/epidemiologia/ftp';
import { IconoBarras, IconoGuion } from '@/components/icons';

interface Props {
  estadisticas: EstadisticasExtraccion;
  /** Qué significa cada clave UP (del backend): va en chiquito debajo del código. */
  descripciones: Record<string, DescripcionClave>;
  clavesActivas: string[];
  onClave: (clave: string) => void;
  unidadesActivas: string[];
  onUnidad: (unidad: string) => void;
}

interface PropsBarras {
  titulo: string;
  conteos: ConteoValor[];
  activos: string[];
  onElegir?: (valor: string) => void;
  /** Color de la tarjeta: guinda para las claves, verde para las unidades (los mismos que el encabezado). */
  tono: 'guinda' | 'verde';
  descripciones?: Record<string, DescripcionClave>;
}

/** Barras de un conteo; con onElegir, un clic agrega ese valor al filtro de la tabla (otro clic lo quita). */
function BarrasConteo({ titulo, conteos, activos, onElegir, tono, descripciones }: PropsBarras) {
  const maximo = Math.max(1, ...conteos.map(c => c.cantidad));

  return (
    // Con descripciones (claves UP) cada renglón lleva el código como etiqueta y su significado abajo
    <section className={`acc-tarjeta acc-conteo acc-conteo--${tono}${descripciones ? ' acc-conteo--claves' : ''}`}>
      <h3 className="acc-tarjeta-titulo"><span className="acc-titulo-icono" aria-hidden="true"><IconoBarras tamano={14} /></span>{titulo}</h3>
      <div className="acc-barras">
        {conteos.map(({ valor, cantidad }) => {
          const texto = valor ?? '(vacío)';
          const elegido = activos.includes(texto);
          const sinResultados = cantidad === 0;
          const descripcion = valor ? descripciones?.[valor]?.descripcion : undefined;
          return (
            <button
              key={texto}
              className={`acc-barra${elegido ? ' acc-barra--activa' : ''}${sinResultados ? ' acc-barra--sin' : ''}`}
              onClick={() => onElegir?.(texto)}
              disabled={!onElegir}
              title={`${texto}${descripcion ? ` · ${descripcion}` : ''}: ${sinResultados ? 'se leyó, sin resultados' : cantidad}`}
            >
              <span className="acc-barra-texto">{texto}</span>
              {descripcion && <span className="acc-barra-descripcion">{descripcion}</span>}
              <span className="acc-barra-pista"><span className="acc-barra-relleno" style={{ width: `${(cantidad / maximo) * 100}%` }} /></span>
              <span className="acc-barra-cantidad">
                {sinResultados ? <IconoGuion tamano={14} aria-label="Sin resultados" /> : cantidad}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}


/** Conteos que manda el backend (por la columna del filtro del mapeo y por unidad); los totales van en ResumenPeriodo. */
export default function EstadisticasAcciones({ estadisticas, descripciones, clavesActivas, onClave, unidadesActivas, onUnidad }: Props) {
  return (
    <>
      {estadisticas.porColumna.map((c, i) => (
        // Solo la primera columna del filtro tiene filtro en la tabla.
        <BarrasConteo key={c.columna} titulo={`Por ${c.columna}`} conteos={c.conteos}
          activos={i === 0 ? clavesActivas : []} onElegir={i === 0 ? onClave : undefined} tono="guinda" descripciones={descripciones} />
      ))}

      {estadisticas.porUnidad.length > 1 && (
        <BarrasConteo titulo="Por unidad" conteos={estadisticas.porUnidad} activos={unidadesActivas} onElegir={onUnidad} tono="verde" />
      )}
    </>
  );
}
