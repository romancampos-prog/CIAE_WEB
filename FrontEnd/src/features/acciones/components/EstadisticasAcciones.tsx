// propios
import type { ConteoValor, DescripcionClave, EstadisticasExtraccion } from '@/types/api/epidemiologia/ftp';
import { IconoBarras, IconoGuion, IconoPalomita } from '@/components/icons';

interface Props {
  estadisticas: EstadisticasExtraccion;
  /** Qué significa cada clave UP (del backend): va en chiquito debajo del código. */
  descripciones: Record<string, DescripcionClave>;
  clavesActivas: string[];
  onClave: (clave: string) => void;
}

interface PropsBarras {
  titulo: string;
  conteos: ConteoValor[];
  activos: string[];
  onElegir?: (valor: string) => void;
  /** Color de la tarjeta (el mismo que el encabezado). */
  tono: 'guinda';
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
              // Cada clave UP con su color (del backend); unidades y claves sin color, el del tema
              style={{ '--clave': (valor && descripciones?.[valor]?.color) || undefined }}
              className={`acc-barra${elegido ? ' acc-barra--activa' : ''}${sinResultados ? ' acc-barra--sin' : ''}`}
              onClick={() => onElegir?.(texto)}
              disabled={!onElegir}
              title={`${texto}${descripcion ? ` · ${descripcion}` : ''}: ${sinResultados ? 'se leyó, sin resultados' : cantidad}`}
            >
              <span className="acc-barra-texto">{texto}</span>
              {descripcion && <span className="acc-barra-descripcion">{descripcion}</span>}
              <span className="acc-barra-pista"><span className="acc-barra-relleno" style={{ width: `${(cantidad / maximo) * 100}%` }} /></span>
              <span className="acc-barra-cantidad">
                {elegido && <span className="acc-barra-elegida" aria-hidden="true"><IconoPalomita tamano={9} /></span>}
                {sinResultados ? <IconoGuion tamano={14} aria-label="Sin resultados" /> : cantidad}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}


/**
 * Conteos que manda el backend por la columna del filtro del mapeo (claves UP), en la columna de al
 * lado de la tabla; los de unidad van abajo de la tabla (GraficaUnidades) y los totales en ResumenPeriodo.
 */
export default function EstadisticasAcciones({ estadisticas, descripciones, clavesActivas, onClave }: Props) {
  return (
    <>
      {estadisticas.porColumna.map((c, i) => (
        // Solo la primera columna del filtro tiene filtro en la tabla.
        <BarrasConteo key={c.columna} titulo={`Por ${c.columna}`} conteos={c.conteos}
          activos={i === 0 ? clavesActivas : []} onElegir={i === 0 ? onClave : undefined} tono="guinda" descripciones={descripciones} />
      ))}

    </>
  );
}
