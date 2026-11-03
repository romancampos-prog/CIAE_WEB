// react
import { useEffect, useRef, useState } from 'react';
// propios
import { useExcelAcciones, type RangoFechas } from '@/features/acciones/hooks/useExcelAcciones';
import { fechaIso, hoyIso } from '@/features/acciones/utils/fechas';
import { IconoCalendario, IconoDescargar, IconoFlechaDerecha, IconoRecargar } from '@/components/icons';
import CalendarioRango from './CalendarioRango';

interface Props {
  /** Las fechas (dd/mm/aaaa) del mes que se ve, ya ordenadas: el rango arranca en ese mes. */
  fechas: string[];
  anio: number;
  /** Usuario de unidad: el Excel solo trae su unidad (lo recorta el backend, aquí solo se avisa). */
  soloMiUnidad: boolean;
}

/**
 * Botón "Excel" del encabezado: abre un panel chico para elegir desde/hasta (puede abarcar varios
 * meses) y descarga el libro que arma el backend. El panel se monta solo al abrirse, para que
 * cada vez arranque con el mes que se está viendo.
 */
export default function DescargarExcelAcciones({ fechas, anio, soloMiUnidad }: Props) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // Se cierra con clic afuera o con Escape
  useEffect(() => {
    if (!abierto) return;
    const alClicAfuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', alClicAfuera);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alClicAfuera);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  const hoy = hoyIso();
  const rangoMes: RangoFechas = fechas.length
    ? { desde: fechaIso(fechas[0]), hasta: fechaIso(fechas[fechas.length - 1]) }
    : { desde: `${hoy.slice(0, 8)}01`, hasta: hoy };
  const finDelAnio = `${anio}-12-31`;
  const rangoAnio: RangoFechas = { desde: `${anio}-01-01`, hasta: finDelAnio < hoy ? finDelAnio : hoy };

  return (
    <div className="acc-excel" ref={caja}>
      <button
        type="button"
        className={`acc-excel-boton${abierto ? ' acc-excel-boton--abierto' : ''}`}
        onClick={() => setAbierto(a => !a)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
      >
        <IconoDescargar tamano={15} aria-hidden /> Excel
      </button>

      {abierto && <PanelExcel rangoMes={rangoMes} rangoAnio={rangoAnio} anio={anio} hoy={hoy} soloMiUnidad={soloMiUnidad} />}
    </div>
  );
}

interface PropsPanel {
  rangoMes: RangoFechas;
  rangoAnio: RangoFechas;
  anio: number;
  hoy: string;
  soloMiUnidad: boolean;
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** aaaa-mm-dd → "28 sep 2026". */
const fechaLegible = (fecha: string) =>
  fecha ? `${Number(fecha.slice(8, 10))} ${MESES_CORTOS[Number(fecha.slice(5, 7)) - 1]} ${fecha.slice(0, 4)}` : '—';

function PanelExcel({ rangoMes, rangoAnio, anio, hoy, soloMiUnidad }: PropsPanel) {
  const excel = useExcelAcciones(rangoMes);
  const esRango = (rango: RangoFechas) => excel.desde === rango.desde && excel.hasta === rango.hasta;

  return (
    <form
      className="acc-excel-panel"
      role="dialog"
      aria-label="Descargar Excel"
      onSubmit={e => { e.preventDefault(); if (excel.puedeDescargar) excel.descargar(); }}
    >
      <p className="acc-excel-titulo">
        <span className="acc-excel-titulo-icono" aria-hidden="true"><IconoCalendario tamano={15} /></span>
        Descargar registros
      </p>

      <div className="acc-excel-atajos">
        <button type="button" className={`acc-excel-atajo${esRango(rangoMes) ? ' acc-excel-atajo--activo' : ''}`} onClick={() => excel.elegirRango(rangoMes)}>
          Mes que se ve
        </button>
        <button type="button" className={`acc-excel-atajo${esRango(rangoAnio) ? ' acc-excel-atajo--activo' : ''}`} onClick={() => excel.elegirRango(rangoAnio)}>
          Todo {anio}
        </button>
      </div>

      {/* Lo elegido arriba del calendario; resaltado el extremo que toca elegir */}
      <div className="acc-excel-fechas" aria-live="polite">
        <div className={`acc-excel-fecha${excel.hasta ? ' acc-excel-fecha--toca' : ''}`}>
          <span className="acc-excel-fecha-etiqueta">Desde</span>
          <span className="acc-excel-fecha-valor">{fechaLegible(excel.desde)}</span>
        </div>
        <IconoFlechaDerecha tamano={14} className="acc-excel-fechas-flecha" aria-hidden />
        <div className={`acc-excel-fecha${excel.hasta ? '' : ' acc-excel-fecha--toca'}`}>
          <span className="acc-excel-fecha-etiqueta">Hasta</span>
          <span className="acc-excel-fecha-valor">{excel.hasta ? fechaLegible(excel.hasta) : 'Elige el día'}</span>
        </div>
      </div>

      <CalendarioRango desde={excel.desde} hasta={excel.hasta} max={hoy} onElegirDia={excel.elegirDia} />

      <p className="acc-excel-nota">
        Por fecha de atención; puede abarcar varios meses. {soloMiUnidad ? 'Solo trae los registros de tu unidad.' : 'Trae todas las unidades.'}
      </p>

      {excel.error && <p className="acc-mensaje acc-mensaje--error" role="alert">{excel.error}</p>}
      {excel.resultado && (
        <p className="acc-mensaje acc-mensaje--ok" role="status">
          Listo: {excel.resultado.totalRegistros.toLocaleString('es-MX')} registros.
        </p>
      )}

      <button type="submit" className={`acc-boton acc-excel-descargar${excel.descargando ? ' acc-boton--trabajando' : ''}`} disabled={!excel.puedeDescargar}>
        {excel.descargando ? <IconoRecargar tamano={15} aria-hidden /> : <IconoDescargar tamano={15} aria-hidden />}
        {excel.descargando ? 'Preparando…' : 'Descargar Excel'}
      </button>
    </form>
  );
}
