// react
import type { RefObject } from 'react';
// propios
import type { useGenerarAcciones } from '@/features/acciones/hooks/useGenerarAcciones';
import { IconoCalendario, IconoCerrar, IconoPalomita, IconoRecargar, IconoReloj, IconoSubirNube } from '@/components/icons';
import { MESES_LARGOS } from '@/features/indicadores';

interface Props {
  generacion: ReturnType<typeof useGenerarAcciones>;
  /** La abre la página: con el mes ya puesto desde el aviso de "mes sin reporte" o desde el panel de meses. */
  ventana: RefObject<HTMLDialogElement | null>;
}

const SEMANAS = [1, 2, 3, 4, 5];

/**
 * Solo admin: la ventana para extraer del FTP el previo (semana del mes) o el definitivo de un
 * mes. No tiene botón propio: se abre al elegir un mes sin reporte o desde el panel de meses,
 * para que generar no compita con la información; en ambos casos llega con el mes ya puesto.
 * A la izquierda, lo que se va a extraer; a la derecha, previo o definitivo (y la semana si es
 * previo). El <dialog> nativo da el foco atrapado y Esc.
 */
export default function GenerarAcciones({ generacion: g, ventana }: Props) {
  const nombreMes = g.mes ? MESES_LARGOS[g.mes] : null;

  return (
    <dialog ref={ventana} className="acc-ventana acc-ventana--generar" aria-labelledby="acc-ventana-titulo">
      {/* Lado guinda: qué hace y el resumen de lo elegido */}
      <aside className="acc-generar-lado">
        <span className="acc-generar-lado-icono" aria-hidden="true"><IconoSubirNube tamano={26} /></span>
        <h2 id="acc-ventana-titulo" className="acc-generar-lado-titulo">Generar reporte OC30</h2>
        <p className="acc-generar-lado-texto">Baja el OC30 de cada unidad del FTP y lo guarda. Tarda unos minutos.</p>

        <dl className="acc-generar-resumen">
          <div><dt>Reporte</dt><dd>{g.tipo === 'previo' ? `Previo · semana ${g.semana}` : 'Definitivo'}</dd></div>
          <div><dt>Periodo</dt><dd><IconoCalendario tamano={15} aria-hidden /> {nombreMes ? `${nombreMes} ${g.anio}` : '—'}</dd></div>
        </dl>
      </aside>

      <div className="acc-generar-cuerpo">
        <button type="button" className="acc-ventana-cerrar acc-generar-cerrar" onClick={() => ventana.current?.close()} aria-label="Cerrar">
          <IconoCerrar tamano={18} />
        </button>
        {g.generando && <div className="acc-ventana-progreso" role="progressbar" aria-label="Extrayendo del FTP" />}

        <fieldset className="acc-paso">
          <legend className="acc-paso-titulo"><span>1</span> ¿Qué reporte?</legend>
          <div className="acc-opciones">
            <label className={`acc-opcion${g.tipo === 'previo' ? ' acc-opcion--activa' : ''}`}>
              <input type="radio" name="acc-tipo" checked={g.tipo === 'previo'} onChange={() => g.setTipo('previo')} />
              {g.tipo === 'previo' && <span className="acc-opcion-marca" aria-hidden="true"><IconoPalomita tamano={11} strokeWidth="3" /></span>}
              <span className="acc-opcion-icono" aria-hidden="true"><IconoReloj tamano={16} strokeWidth="2" /></span>
              <span className="acc-opcion-textos">
                <span className="acc-opcion-titulo">Previo</span>
                <span className="acc-opcion-texto">Avance de una semana</span>
              </span>
            </label>
            <label className={`acc-opcion${g.tipo === 'final' ? ' acc-opcion--activa' : ''}`}>
              <input type="radio" name="acc-tipo" checked={g.tipo === 'final'} onChange={() => g.setTipo('final')} />
              {g.tipo === 'final' && <span className="acc-opcion-marca" aria-hidden="true"><IconoPalomita tamano={11} strokeWidth="3" /></span>}
              <span className="acc-opcion-icono" aria-hidden="true"><IconoPalomita tamano={16} strokeWidth="2" /></span>
              <span className="acc-opcion-textos">
                <span className="acc-opcion-titulo">Definitivo</span>
                <span className="acc-opcion-texto">Mes cerrado, reemplaza al previo</span>
              </span>
            </label>
          </div>
        </fieldset>

        {/* El mes ya viene elegido desde la página: solo el previo pide la semana */}
        {g.tipo === 'previo' && (
          <fieldset className="acc-paso acc-paso--semanas">
            <legend className="acc-paso-titulo"><span>2</span> ¿Qué semana?</legend>
            <div className="acc-generar-semanas" role="radiogroup" aria-label="Semana">
              {SEMANAS.map(s => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={g.semana === s}
                  className={`acc-generar-chip${g.semana === s ? ' acc-generar-chip--activo' : ''}`}
                  onClick={() => g.setSemana(s)}
                >
                  Semana {s}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {g.error && <p className="acc-mensaje acc-mensaje--error" role="alert">{g.error}</p>}
        {g.resultado && (
          <p className="acc-mensaje acc-mensaje--ok" role="status">
            Listo ({g.resultado.semana === null ? 'definitivo' : `previo semana ${g.resultado.semana}`}):
            {' '}{g.resultado.mensaje}
          </p>
        )}

        <footer className="acc-generar-pie">
          <button type="button" className="acc-boton-secundario" onClick={() => ventana.current?.close()}>Cerrar</button>
          <button type="button" className={`acc-boton${g.generando ? ' acc-boton--trabajando' : ''}`} onClick={g.generar} disabled={!g.puedeGenerar}>
            <IconoRecargar tamano={15} /> {g.generando ? 'Extrayendo…' : 'Extraer del FTP'}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
