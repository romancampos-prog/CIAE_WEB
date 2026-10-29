// react
import { useState } from 'react';
// propios
import type { FilaExtraccion } from '@/types/api/epidemiologia/ftp';
import { IconoChevronAbajo, IconoChevronArriba } from '@/components/icons';
import { fechaComparable } from '@/features/acciones/utils/fechas';

interface Props {
  filas: FilaExtraccion[];
  /** Columna del filtro del mapeo (ej. "Clave de la Acción"): se pinta como etiqueta y al tocarla filtra. */
  columnaClave: string | null;
  /** Columna con puras fechas: la tabla arranca ordenada por ella (de la más vieja a la más nueva). */
  columnaFecha: string | null;
  onFiltrarClave: (clave: string) => void;
}

interface Orden {
  columna: string;
  ascendente: boolean;
}

/** Las filas tal cual las guardó el backend: las columnas salen de la propia fila (Unidad + `seleccionar` del mapeo). Ordenable por encabezado. */
export default function TablaExtraccion({ filas, columnaClave, columnaFecha, onFiltrarClave }: Props) {
  const [ordenElegido, setOrden] = useState<Orden | null>(null);
  // Mientras no se elija otro orden, por fecha
  const orden = ordenElegido ?? (columnaFecha ? { columna: columnaFecha, ascendente: true } : null);

  if (filas.length === 0) {
    return <p className="acc-vacio">Ningún registro coincide con los filtros.</p>;
  }

  const columnas = Object.keys(filas[0]);
  const filasOrdenadas = orden ? ordenarFilas(filas, orden, orden.columna === columnaFecha) : filas;

  const cambiarOrden = (columna: string) =>
    setOrden(orden?.columna === columna ? { columna, ascendente: !orden.ascendente } : { columna, ascendente: true });

  return (
    <div className="acc-tabla-caja">
      <table className="acc-tabla">
        <thead>
          <tr>
            <th className="acc-col-numero">#</th>
            {columnas.map(c => (
              <th key={c} aria-sort={orden?.columna === c ? (orden.ascendente ? 'ascending' : 'descending') : 'none'}>
                <button className="acc-th-boton" onClick={() => cambiarOrden(c)}>
                  {c}
                  {orden?.columna === c && (orden.ascendente ? <IconoChevronArriba tamano={10} /> : <IconoChevronAbajo tamano={10} />)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filasOrdenadas.map((fila, i) => (
            <tr key={i}>
              <td className="acc-col-numero">{i + 1}</td>
              {columnas.map(c => (
                <td key={c}>
                  {c === columnaClave && fila[c] ? (
                    <button className="acc-clave" onClick={() => onFiltrarClave(fila[c] ?? '')} title="Filtrar por esta clave">
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
    </div>
  );
}

function ordenarFilas(filas: FilaExtraccion[], { columna, ascendente }: Orden, esFecha: boolean): FilaExtraccion[] {
  const signo = ascendente ? 1 : -1;
  // dd/mm/aaaa como texto se ordenaría por día; la fecha se compara como aaaammdd
  const valor = (fila: FilaExtraccion) => (esFecha ? fechaComparable(fila[columna] ?? '') : fila[columna] ?? '');
  return [...filas].sort((a, b) => signo * valor(a).localeCompare(valor(b), 'es', { numeric: true, sensitivity: 'base' }));
}
