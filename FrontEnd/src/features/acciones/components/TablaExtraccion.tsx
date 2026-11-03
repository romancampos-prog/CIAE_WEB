// propios
import type { ConteoValor, DescripcionClave, FilaExtraccion } from '@/types/api/epidemiologia/ftp';
import type { FiltrosAcciones } from '@/types/pantallas/acciones';
import { IconoBuscar, IconoCalendario, IconoCapas, IconoCerrar, IconoListaBarras } from '@/components/icons';
import { fechaComparable } from '@/features/acciones/utils/fechas';
import FiltroColumna from './FiltroColumna';
import { BuscadorColumna, ListaOpciones, RangoFechas } from './ControlesFiltro';

interface Props {
  /** Las columnas de todo el mes (no de lo filtrado): los encabezados no desaparecen aunque el filtro deje cero filas. */
  columnas: string[];
  filas: FilaExtraccion[];
  /** Columna del filtro del mapeo (ej. "Clave de la Acción"): se pinta como etiqueta y al tocarla filtra. */
  columnaClave: string | null;
  /** Columna con puras fechas: la tabla va ordenada por ella (de la más vieja a la más nueva). */
  columnaFecha: string | null;
  filtros: FiltrosAcciones;
  onCambiar: (cambios: Partial<FiltrosAcciones>) => void;
  claves: ConteoValor[];
  /** Qué significa cada clave UP: al pasar el mouse por la clave. */
  descripciones: Record<string, DescripcionClave>;
  unidades: ConteoValor[];
  fechas: string[];
  onFiltrarClave: (clave: string) => void;
  hayFiltros: boolean;
  onLimpiar: () => void;
}

const enCorto = (elegidos: string[]) =>
  elegidos.length === 0 ? null : elegidos.length === 1 ? elegidos[0] : `${elegidos[0]} +${elegidos.length - 1}`;

/**
 * Las filas tal cual las guardó el backend: las columnas salen de la propia fila (Unidad + `seleccionar`
 * del mapeo), ordenadas por fecha. Cada encabezado filtra: Unidad y la clave con lista, la fecha con
 * rango y las demás con buscador; lo elegido se ve en chiquito debajo del nombre de la columna.
 */
export default function TablaExtraccion({ columnas, filas, columnaClave, columnaFecha, filtros, onCambiar, claves, descripciones, unidades, fechas, onFiltrarClave, hayFiltros, onLimpiar }: Props) {
  const filasOrdenadas = columnaFecha ? ordenarPorFecha(filas, columnaFecha) : filas;

  // Ícono, resumen y control de filtro de cada columna según su papel
  const filtroDe = (columna: string) => {
    if (columna === 'Unidad' && unidades.length > 1) return {
      icono: <IconoCapas tamano={12} />,
      resumen: enCorto(filtros.unidades),
      control: <ListaOpciones opciones={unidades} elegidos={filtros.unidades} onCambiar={unidades => onCambiar({ unidades })} />,
    };
    if (columna === columnaClave) return {
      icono: <IconoListaBarras tamano={12} />,
      resumen: enCorto(filtros.claves),
      control: <ListaOpciones opciones={claves} elegidos={filtros.claves} onCambiar={claves => onCambiar({ claves })} />,
    };
    if (columna === columnaFecha && fechas.length > 1) return {
      icono: <IconoCalendario tamano={12} />,
      resumen: filtros.desde || filtros.hasta ? `${filtros.desde || fechas[0]} – ${filtros.hasta || fechas[fechas.length - 1]}` : null,
      control: <RangoFechas fechas={fechas} desde={filtros.desde} hasta={filtros.hasta} onCambiar={onCambiar} />,
    };
    // Usuario de unidad: solo llega la suya, no hay nada que filtrar
    if (columna === 'Unidad') return { icono: <IconoCapas tamano={12} />, resumen: null, control: null };
    const texto = filtros.textos[columna] ?? '';
    return {
      icono: <IconoBuscar tamano={12} />,
      resumen: texto ? `“${texto}”` : null,
      control: <BuscadorColumna columna={columna} texto={texto} onCambiar={nuevo => onCambiar({ textos: { ...filtros.textos, [columna]: nuevo } })} />,
    };
  };

  return (
    <div className="acc-tabla-caja">
      <table className="acc-tabla">
        <thead>
          <tr>
            <th className="acc-col-numero">
              {/* Con filtros puestos, la esquina de la tabla los quita todos */}
              {hayFiltros ? (
                <button type="button" className="acc-quitar-filtros" onClick={onLimpiar} aria-label="Quitar todos los filtros" title="Quitar todos los filtros">
                  <IconoCerrar tamano={10} />
                </button>
              ) : '#'}
            </th>
            {columnas.map(c => {
              const { icono, resumen, control } = filtroDe(c);
              return (
                <th key={c}>
                  {control ? (
                    <FiltroColumna columna={c} icono={icono} resumen={resumen}>{control}</FiltroColumna>
                  ) : (
                    <span className="acc-th-boton acc-th-boton--fijo">
                      <span className="acc-th-icono" aria-hidden="true">{icono}</span>{c}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filasOrdenadas.map((fila, i) => (
            <tr key={i}>
              <td className="acc-col-numero">{i + 1}</td>
              {columnas.map(c => (
                <td key={c} className={esCorto(fila[c]) ? 'acc-celda-corta' : undefined}>
                  {c === columnaClave && fila[c] ? (
                    <button className="acc-clave" onClick={() => onFiltrarClave(fila[c] ?? '')} title={`${descripciones[fila[c] ?? '']?.descripcion ?? fila[c]} · clic para filtrar`}>
                      {fila[c]}
                    </button>
                  ) : (
                    fila[c] ?? '—'
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {filas.length === 0 && <p className="acc-vacio">Ningún registro coincide con los filtros.</p>}
    </div>
  );
}

// Fechas, NSS, claves y demás valores sin espacios no se parten; los nombres largos sí bajan de renglón (así no hay scroll lateral)
const esCorto = (valor: string | null | undefined) => !valor || !valor.includes(' ') || valor.length <= 16;

// dd/mm/aaaa como texto se ordenaría por día; la fecha se compara como aaaammdd
function ordenarPorFecha(filas: FilaExtraccion[], columnaFecha: string): FilaExtraccion[] {
  return [...filas].sort((a, b) => fechaComparable(a[columnaFecha] ?? '').localeCompare(fechaComparable(b[columnaFecha] ?? '')));
}
