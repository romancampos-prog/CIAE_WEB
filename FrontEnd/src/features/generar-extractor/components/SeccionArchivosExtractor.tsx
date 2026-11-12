// react
import { useState } from 'react';

// propios
import { IconoChevronAbajo } from '@/components/icons';
import SeccionCensoDm from './SeccionCensoDm';
import TablaArchivosExtractor from './TablaArchivosExtractor';
import type { EstadoGenerarExtractor } from '@/features/generar-extractor/hooks/useGenerarExtractor';

const CLAVE_GUARDADO = 'extractor.archivosAbiertos';

// Recuerda cómo la dejó el usuario; la primera vez, en celular arranca cerrada porque ocupa mucho
const abiertaAlEntrar = (): boolean => {
  try {
    const guardado = localStorage.getItem(CLAVE_GUARDADO);
    if (guardado !== null) return guardado === '1';
  } catch { /* sin almacenamiento: se usa el valor por pantalla */ }
  return !window.matchMedia('(max-width: 760px)').matches;
};

/** Tarjeta "Archivos de {año}" que se pliega desde su propio encabezado; cerrada deja una línea con el avance. */
const SeccionArchivosExtractor = ({ ex }: { ex: EstadoGenerarExtractor }) => {
  const [abierta, setAbierta] = useState(abiertaAlEntrar);

  const alternar = () => {
    setAbierta(a => {
      try { localStorage.setItem(CLAVE_GUARDADO, a ? '0' : '1'); } catch { /* no se recuerda, no pasa nada */ }
      return !a;
    });
  };

  const subidos = ex.archivos.reduce((n, a) => n + a.meses.filter(m => m.estado === 'completo').length, 0);
  const total = ex.archivos.length * 12;

  return (
    <section className={`exv-panel exp-panel${abierta ? ' exp-panel--abierta' : ''}`} aria-label={`Archivos subidos en ${ex.anio}`}>
      <button type="button" className="exp-encabezado" aria-expanded={abierta} aria-controls="exp-contenido" onClick={alternar}>
        <IconoChevronAbajo className="exp-flecha" tamano={16} />
        <span className="exv-seccion-titulo exp-titulo">Archivos de {ex.anio}</span>
        {ex.archivos.length > 0 && (
          <span className="exp-resumen">{ex.archivos.length} archivos · {subidos}/{total} meses subidos</span>
        )}
        <span className="exp-accion">{abierta ? 'Ocultar' : 'Mostrar'}</span>
      </button>

      <div id="exp-contenido" className="exp-contenido" inert={!abierta}>
        <div className="exp-contenido-interior">
          {ex.cargando && !ex.archivos.length && <p className="ex-cargando">Cargando…</p>}
          {ex.archivos.length > 0 && <TablaArchivosExtractor ex={ex} />}
          <SeccionCensoDm />
        </div>
      </div>
    </section>
  );
};

export default SeccionArchivosExtractor;
