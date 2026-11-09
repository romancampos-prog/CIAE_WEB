// react
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
// propios
import type { DescripcionClave, EstatusAccion, EstudioAccion, FilaExtraccion } from '@/types/api/epidemiologia/ftp';
import {
  IconoCalendario, IconoCapas, IconoCerrar, IconoDescargar, IconoDocumento, IconoExcel, IconoFichaTecnica,
  IconoListaBarras, IconoSubirNube, IconoUsuario,
} from '@/components/icons';

interface Props {
  fila: FilaExtraccion;
  columnas: string[];
  /** Como se muestra cada columna (del mapeo, ej. "NSS"). */
  etiquetas: Record<string, string>;
  /** Qué ícono lleva cada columna (del mapeo). */
  iconos: Record<string, string>;
  columnaClave: string | null;
  descripcion: DescripcionClave | undefined;
  estatus: EstatusAccion | undefined;
  catalogo: EstatusAccion[];
  onCambiarEstatus: (estatus: string) => void;
  estudio: EstudioAccion | undefined;
  subiendo: boolean;
  /** Por qué no se pudo subir o bajar el estudio. */
  error: string | null;
  onSubir: (archivo: File) => void;
  onDescargar: () => void;
  onCerrar: () => void;
}

// Los nombres de ícono que puede usar el mapeo (iconosColumna); uno desconocido usa el de documento
const ICONOS: Record<string, ReactNode> = {
  unidad:     <IconoCapas tamano={15} />,
  calendario: <IconoCalendario tamano={15} />,
  credencial: <IconoFichaTecnica tamano={15} />,
  etiqueta:   <IconoDocumento tamano={15} />,
  persona:    <IconoUsuario tamano={15} />,
  clave:      <IconoListaBarras tamano={15} />,
};

/**
 * Tarjeta flotante de un registro de Acciones (solo admin, al tocar su fila). Arriba, destacada, la
 * acción (clave UP y qué es), porque dice de qué trata el registro; luego los datos con su ícono, el
 * estatus y, en "Con estudio", el estudio (Excel) que mandó el doctor: subirlo, bajarlo o reemplazarlo.
 */
export default function DetalleRegistro({
  fila, columnas, etiquetas, iconos, columnaClave, descripcion, estatus, catalogo, onCambiarEstatus,
  estudio, subiendo, error, onSubir, onDescargar, onCerrar,
}: Props) {
  const [arrastrando, setArrastrando] = useState(false);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  const elegir = (archivo: File | undefined) => { if (archivo) onSubir(archivo); };
  const clave = columnaClave ? fila[columnaClave] : null;
  const datos = columnas.filter(c => c !== 'Unidad' && c !== columnaClave);
  const icono = (columna: string) => ICONOS[iconos[columna] ?? ''] ?? <IconoDocumento tamano={15} />;

  return createPortal(
    <div className="acc-detalle-fondo" onClick={onCerrar}>
      <section className="acc-registro" role="dialog" aria-modal="true" aria-label={`Registro de ${fila.Unidad}`} onClick={e => e.stopPropagation()}>
        <header className="acc-registro-encabezado">
          <span className="acc-registro-encabezado-icono" aria-hidden="true">{icono('Unidad')}</span>
          <div>
            <p className="acc-registro-unidad">Registro</p>
            <h3 className="acc-registro-titulo">{fila.Unidad}</h3>
          </div>
          <button type="button" className="acc-registro-cerrar" onClick={onCerrar} aria-label="Cerrar"><IconoCerrar tamano={14} /></button>
        </header>

        {/* Lo más importante: qué acción es (la clave UP y su significado), con el color de la clave */}
        {clave && (
          <div className="acc-registro-accion" style={{ '--clave': descripcion?.color ?? undefined }}>
            <span className="acc-clave">{clave}</span>
            <div>
              <strong>{descripcion?.descripcion ?? 'Clave sin descripción en el catálogo'}</strong>
              {descripcion?.subgrupo && <small>{descripcion.subgrupo}</small>}
            </div>
          </div>
        )}

        <dl className="acc-registro-datos">
          {datos.map(c => (
            <div key={c}>
              <span className="acc-registro-dato-icono" aria-hidden="true">{icono(c)}</span>
              <dt>{(etiquetas[c] ?? c).replace('\n', ' ')}</dt>
              <dd>{fila[c] ?? '—'}</dd>
            </div>
          ))}
        </dl>

        <div className="acc-registro-estatus">
          <span>Estatus</span>
          <select
            className={`acc-estatus acc-estatus--${estatus?.nivel ?? 'Bajo'}`}
            value={estatus?.clave ?? ''}
            onChange={e => onCambiarEstatus(e.target.value)}
            aria-label="Estatus del registro"
          >
            {catalogo.map(e => <option key={e.clave} value={e.clave}>{e.nombre}</option>)}
          </select>
        </div>

        {/* El estudio: solo con un estatus que lo permite (Con estudio) */}
        {estatus?.permiteEstudio ? (
          <div className="acc-registro-estudio">
            {error && <p className="acc-registro-error" role="alert">{error}</p>}
            {estudio && (
              <div className="acc-registro-archivo">
                <span className="acc-registro-archivo-icono"><IconoExcel tamano={22} /></span>
                <div>
                  <strong>{estudio.ruta.split('/').pop()}</strong>
                  <small>Subido {estudio.fecha.replace('T', ' ')} · {estudio.usuario}</small>
                </div>
                <button type="button" className="acc-registro-boton" onClick={onDescargar}><IconoDescargar tamano={14} /> Descargar</button>
              </div>
            )}
            <label
              className={`acc-registro-subir${arrastrando ? ' acc-registro-subir--encima' : ''}${subiendo ? ' acc-registro-subir--subiendo' : ''}`}
              onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={e => { e.preventDefault(); setArrastrando(false); elegir(e.dataTransfer.files[0]); }}
            >
              <IconoSubirNube tamano={26} />
              <strong>{subiendo ? 'Subiendo…' : estudio ? 'Reemplazar el estudio' : 'Subir el estudio'}</strong>
              <small>{estudio ? 'El anterior se guarda como respaldo. ' : ''}Arrastra el Excel aquí o haz clic para elegirlo (.xlsx, .xls)</small>
              <input type="file" accept=".xlsx,.xls" hidden disabled={subiendo}
                onChange={e => { elegir(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          </div>
        ) : (
          <p className="acc-registro-nota">El estudio se sube cuando el registro está en «Con estudio».</p>
        )}
      </section>
    </div>,
    document.body,
  );
}
