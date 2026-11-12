// react
import { useMemo, useState } from 'react';
// propios
import type { ConteoValor, DescripcionClave, EstatusAccion, EstudioAccion, FilaExtraccion } from '@/types/api/epidemiologia/ftp';
import type { FiltrosAcciones } from '@/types/pantallas/acciones';
import { IconoBuscar, IconoCalendario, IconoCapas, IconoCerrar, IconoHojaExcel, IconoListaBarras, IconoPalomita } from '@/components/icons';
import DetalleRegistro from './DetalleRegistro';
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
  /** Qué significa cada clave UP: al pasar el mouse por la clave. */
  descripciones: Record<string, DescripcionClave>;
  unidades: ConteoValor[];
  fechas: string[];
  onFiltrarClave: (clave: string) => void;
  hayFiltros: boolean;
  onLimpiar: () => void;
  /** Estatus de seguimiento de cada registro ({ _id: clave }) y sus opciones (del backend). */
  estatus: Record<string, string>;
  catalogoEstatus: EstatusAccion[];
  /** Solo el admin lo cambia; el usuario de unidad solo lo ve. */
  onCambiarEstatus?: (id: string, estatus: string) => void;
  /** Solo admin: estudios ya guardados y cómo subir / bajar uno (con estatus "Con estudio"). */
  estudios?: Record<string, EstudioAccion>;
  /** Con password cuando reemplaza uno existente; alTerminar corre solo si se guardó. */
  onSubirEstudio?: (id: string, archivo: File, password?: string, alTerminar?: () => void) => void;
  onLimpiarErrorEstudio?: () => void;
  onDescargarEstudio?: (id: string) => void;
  subiendoEstudio?: string | null;
  /** Por qué no se pudo subir o bajar un estudio, y de qué registro. */
  errorEstudio?: { id: string | undefined; mensaje: string } | null;
  /** Como se muestra cada columna en el encabezado (del mapeo, ej. "NSS"). */
  etiquetas?: Record<string, string>;
  /** Qué ícono lleva cada columna en la tarjeta del registro (del mapeo). */
  iconos?: Record<string, string>;
}

const enCorto = (elegidos: string[]) =>
  elegidos.length === 0 ? null : elegidos.length === 1 ? elegidos[0] : `${elegidos[0]} +${elegidos.length - 1}`;

/**
 * Las filas tal cual las guardó el backend: las columnas salen de la propia fila (Unidad + `seleccionar`
 * del mapeo), ordenadas por fecha. Cada encabezado filtra: Unidad con lista, la fecha con rango y las
 * demás con buscador (la clave se filtra desde su tarjeta); lo elegido se ve en chiquito bajo el nombre.
 */
export default function TablaExtraccion({ columnas, filas, columnaClave, columnaFecha, filtros, onCambiar, descripciones, unidades, fechas, onFiltrarClave, hayFiltros, onLimpiar, estatus, catalogoEstatus, onCambiarEstatus, estudios = {}, onSubirEstudio, onLimpiarErrorEstudio, onDescargarEstudio, subiendoEstudio, errorEstudio, etiquetas = {}, iconos = {} }: Props) {
  const filasOrdenadas = useMemo(() => (columnaFecha ? ordenarPorFecha(filas, columnaFecha) : filas), [filas, columnaFecha]);
  // Admin: al tocar una fila se abre su tarjeta (datos, estatus y estudio)
  const [abierta, setAbierta] = useState<string | null>(null);
  const puedeAbrir = !!(onCambiarEstatus && onSubirEstudio && onDescargarEstudio);
  const filaAbierta = abierta ? filas.find(f => f._id === abierta) : undefined;

  // El cuerpo (cientos de filas) solo se vuelve a armar si cambian los datos: abrir o cerrar la tarjeta
  // de un registro no lo redibuja, así la tarjeta sale al instante
  const cuerpo = useMemo(() => (
    <tbody>
      {filasOrdenadas.map((fila, i) => (
        <tr
          key={fila._id ?? i}
          className={puedeAbrir ? 'acc-fila-abrible' : undefined}
          onClick={puedeAbrir && fila._id ? () => setAbierta(fila._id as string) : undefined}
        >
          <td className="acc-col-numero">{i + 1}</td>
          {columnas.map(c => (
            <td key={c} className={esCorto(fila[c]) ? 'acc-celda-corta' : undefined}>
              {c === columnaClave && fila[c] ? (
                <button className="acc-clave" style={{ '--clave': descripciones[fila[c] ?? '']?.color ?? undefined }} onClick={e => { e.stopPropagation(); onFiltrarClave(fila[c] ?? ''); }} title={`${descripciones[fila[c] ?? '']?.descripcion ?? fila[c]} · clic para filtrar`}>
                  {fila[c]}
                </button>
              ) : (
                fila[c] ?? '—'
              )}
            </td>
          ))}
          <td className="acc-col-estatus">
            <CeldaEstatus
              actual={catalogoEstatus.find(e => e.clave === estatus[fila._id ?? ''])}
              catalogo={catalogoEstatus}
              onCambiar={onCambiarEstatus && fila._id ? nuevo => onCambiarEstatus(fila._id as string, nuevo) : undefined}
            />
            {puedeAbrir && fila._id && catalogoEstatus.find(e => e.clave === estatus[fila._id as string])?.permiteEstudio && (
              <IndicadorEstudio estudio={estudios[fila._id]} subiendo={subiendoEstudio === fila._id} onAbrir={() => setAbierta(fila._id as string)} />
            )}
          </td>
        </tr>
      ))}
    </tbody>
  ), [filasOrdenadas, columnas, columnaClave, descripciones, onFiltrarClave, catalogoEstatus, estatus, onCambiarEstatus, puedeAbrir, estudios, subiendoEstudio]);

  // Ícono, resumen y control de filtro de cada columna según su papel
  const filtroDe = (columna: string) => {
    if (columna === 'Unidad' && unidades.length > 1) return {
      icono: <IconoCapas tamano={12} />,
      resumen: enCorto(filtros.unidades),
      control: <ListaOpciones opciones={unidades} elegidos={filtros.unidades} onCambiar={unidades => onCambiar({ unidades })} />,
    };
    // La clave se filtra desde la tarjeta "Por Clave de la Acción": aquí solo se dice lo elegido
    if (columna === columnaClave) return { icono: <IconoListaBarras tamano={12} />, resumen: enCorto(filtros.claves), control: null };
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
                    <FiltroColumna columna={c} etiqueta={etiquetas[c]} icono={icono} resumen={resumen}>{control}</FiltroColumna>
                  ) : (
                    <span className={`acc-th-boton acc-th-boton--fijo${resumen ? ' acc-th-boton--filtrado' : ''}`}>
                      <span className="acc-th-icono" aria-hidden="true">{icono}</span>
                      <span className="acc-th-nombre">
                        <span className="acc-th-etiqueta">{etiquetas[c] ?? c}</span>
                        {resumen && <span className="acc-th-filtro">{resumen}</span>}
                      </span>
                    </span>
                  )}
                </th>
              );
            })}
            <th className="acc-col-estatus">
              <span className="acc-th-boton acc-th-boton--fijo">Estatus</span>
            </th>
          </tr>
        </thead>
        {cuerpo}
      </table>
      {filas.length === 0 && <p className="acc-vacio">Ningún registro coincide con los filtros.</p>}
      {filaAbierta && filaAbierta._id && onCambiarEstatus && onSubirEstudio && onDescargarEstudio && (
        <DetalleRegistro
          fila={filaAbierta}
          columnas={columnas}
          etiquetas={etiquetas}
          iconos={iconos}
          columnaClave={columnaClave}
          descripcion={columnaClave ? descripciones[filaAbierta[columnaClave] ?? ''] : undefined}
          estatus={catalogoEstatus.find(e => e.clave === estatus[filaAbierta._id as string])}
          catalogo={catalogoEstatus}
          onCambiarEstatus={nuevo => onCambiarEstatus(filaAbierta._id as string, nuevo)}
          estudio={estudios[filaAbierta._id]}
          subiendo={subiendoEstudio === filaAbierta._id}
          error={errorEstudio?.id === filaAbierta._id ? errorEstudio.mensaje : null}
          onSubir={(archivo, password, alTerminar) => onSubirEstudio(filaAbierta._id as string, archivo, password, alTerminar)}
          onLimpiarError={() => onLimpiarErrorEstudio?.()}
          onDescargar={() => onDescargarEstudio(filaAbierta._id as string)}
          onCerrar={() => setAbierta(null)}
        />
      )}
    </div>
  );
}

/** El estatus del registro con su color (rojo, dorado, verde): lista para el admin, etiqueta para el de unidad. */
function CeldaEstatus({ actual, catalogo, onCambiar }: {
  actual: EstatusAccion | undefined;
  catalogo: EstatusAccion[];
  onCambiar?: (estatus: string) => void;
}) {
  if (!actual) return <span className="acc-estatus">—</span>;
  if (!onCambiar) return <span className={`acc-estatus acc-estatus--${actual.nivel}`}>{actual.nombre}</span>;
  return (
    <select
      className={`acc-estatus acc-estatus--${actual.nivel}`}
      value={actual.clave}
      onChange={e => onCambiar(e.target.value)}
      onClick={e => e.stopPropagation()}
      aria-label="Estatus del registro"
    >
      {catalogo.map(e => <option key={e.clave} value={e.clave}>{e.nombre}</option>)}
    </select>
  );
}

/** Junto a "Con estudio": falta el estudio (ámbar, punteado) o ya está (verde con palomita). Abre la tarjeta del registro. */
function IndicadorEstudio({ estudio, subiendo, onAbrir }: { estudio: EstudioAccion | undefined; subiendo: boolean; onAbrir: () => void }) {
  return (
    <button
      type="button"
      className={`acc-indicador-estudio acc-indicador-estudio--${estudio ? 'listo' : 'falta'}${subiendo ? ' acc-indicador-estudio--subiendo' : ''}`}
      onClick={e => { e.stopPropagation(); onAbrir(); }}
      title={subiendo ? 'Subiendo el estudio…' : estudio ? `Estudio: ${estudio.ruta.split('/').pop()}` : 'Falta subir el estudio'}
      aria-label={estudio ? 'Ver el estudio' : 'Subir el estudio'}
    >
      <IconoHojaExcel tamano={16} />
      <span className="acc-indicador-estudio-marca" aria-hidden="true">
        {estudio ? <IconoPalomita tamano={8} strokeWidth="4" /> : <IconoCerrar tamano={7} strokeWidth="4" />}
      </span>
    </button>
  );
}

// Fechas, NSS, claves y demás valores sin espacios no se parten; los nombres largos sí bajan de renglón (así no hay scroll lateral)
const esCorto = (valor: string | null | undefined) => !valor || !valor.includes(' ') || valor.length <= 16;

// dd/mm/aaaa como texto se ordenaría por día; la fecha se compara como aaaammdd
function ordenarPorFecha(filas: FilaExtraccion[], columnaFecha: string): FilaExtraccion[] {
  return [...filas].sort((a, b) => fechaComparable(a[columnaFecha] ?? '').localeCompare(fechaComparable(b[columnaFecha] ?? '')));
}
