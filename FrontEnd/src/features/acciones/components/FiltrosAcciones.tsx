// propios
import type { ConteoValor } from '@/types/api/epidemiologia/ftp';
import type { FiltrosAcciones as Filtros } from '@/types/pantallas/acciones';
import { IconoBuscar, IconoCalendario, IconoCerrar } from '@/components/icons';
import SelectorMultiple from './SelectorMultiple';

interface Props {
  filtros: Filtros;
  columnaClave: string | null;
  columnaFecha: string | null;
  /** Fechas distintas que trae el mes, ya ordenadas. */
  fechas: string[];
  claves: ConteoValor[];
  unidades: ConteoValor[];
  total: number;
  visibles: number;
  onCambiar: (cambios: Partial<Filtros>) => void;
  onLimpiar: () => void;
}

/** Búsqueda libre (NSS, nombre, fecha...), las claves del filtro del mapeo y, si hay varias, las unidades (varias a la vez), el rango de fechas (solo las que llegaron); abajo, los filtros activos para quitarlos uno por uno. */
export default function FiltrosAcciones({ filtros, columnaClave, columnaFecha, fechas, claves, unidades, total, visibles, onCambiar, onLimpiar }: Props) {
  const hayFiltros = !!(filtros.texto || filtros.claves.length || filtros.unidades.length || filtros.desde || filtros.hasta);
  // Cada lista solo ofrece lo que deja el rango coherente (desde ≤ hasta).
  const fechasDesde = filtros.hasta ? fechas.slice(0, fechas.indexOf(filtros.hasta) + 1) : fechas;
  const fechasHasta = filtros.desde ? fechas.slice(fechas.indexOf(filtros.desde)) : fechas;
  const primeraFecha = fechas[0] ?? '';
  const ultimaFecha  = fechas[fechas.length - 1] ?? '';

  return (
    <div className="acc-filtros">
      <div className="acc-filtros-fila">
        <label className="acc-buscar">
          <IconoBuscar tamano={16} />
          <input
            value={filtros.texto}
            onChange={e => onCambiar({ texto: e.target.value })}
            placeholder="Buscar por NSS, nombre, fecha…"
            aria-label="Buscar"
          />
          {filtros.texto && (
            <button className="acc-buscar-borrar" onClick={() => onCambiar({ texto: '' })} aria-label="Borrar búsqueda">
              <IconoCerrar tamano={12} />
            </button>
          )}
        </label>

        <span className="acc-contador" aria-live="polite">
          <strong>{visibles.toLocaleString('es-MX')}</strong>
          {visibles !== total && <> de {total.toLocaleString('es-MX')}</>} registros
        </span>
      </div>

      <div className="acc-filtros-fila acc-filtros-fila--selectores">
        {columnaClave && (
          <SelectorMultiple etiqueta={columnaClave} opciones={claves} elegidos={filtros.claves} onCambiar={claves => onCambiar({ claves })} />
        )}

        {unidades.length > 1 && (
          <SelectorMultiple etiqueta="Unidad" opciones={unidades} elegidos={filtros.unidades} onCambiar={unidades => onCambiar({ unidades })} />
        )}

        {columnaFecha && fechas.length > 1 && (
          <div className="acc-rango" role="group" aria-label={`Rango de ${columnaFecha}`} title={columnaFecha}>
            <span className="acc-rango-icono" aria-hidden="true"><IconoCalendario tamano={16} /></span>
            {/* Sin rango se ven la primera y la última fecha que llegaron; elegir un extremo equivale a no filtrar por ese lado */}
            <label className={`acc-rango-tramo${filtros.desde ? ' acc-rango-tramo--activo' : ''}`}>
              <span className="acc-selector-etiqueta">{columnaFecha} desde</span>
              <select
                value={filtros.desde || primeraFecha}
                onChange={e => onCambiar({ desde: e.target.value === primeraFecha ? '' : e.target.value })}
              >
                {fechasDesde.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <span className="acc-rango-division" aria-hidden="true" />
            <label className={`acc-rango-tramo${filtros.hasta ? ' acc-rango-tramo--activo' : ''}`}>
              <span className="acc-selector-etiqueta">Hasta</span>
              <select
                value={filtros.hasta || ultimaFecha}
                onChange={e => onCambiar({ hasta: e.target.value === ultimaFecha ? '' : e.target.value })}
              >
                {fechasHasta.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
          </div>
        )}
      </div>

      {hayFiltros && (
        <div className="acc-filtros-activos">
          {filtros.texto && <ChipFiltro texto={`“${filtros.texto}”`} onQuitar={() => onCambiar({ texto: '' })} />}
          {filtros.claves.map(c => (
            <ChipFiltro key={`c-${c}`} texto={c} onQuitar={() => onCambiar({ claves: filtros.claves.filter(v => v !== c) })} />
          ))}
          {filtros.unidades.map(u => (
            <ChipFiltro key={`u-${u}`} texto={u} onQuitar={() => onCambiar({ unidades: filtros.unidades.filter(v => v !== u) })} />
          ))}
          {(filtros.desde || filtros.hasta) && (
            <ChipFiltro
              texto={`${filtros.desde || primeraFecha} – ${filtros.hasta || ultimaFecha}`}
              onQuitar={() => onCambiar({ desde: '', hasta: '' })}
            />
          )}
          <button className="acc-limpiar" onClick={onLimpiar}>Limpiar todo</button>
        </div>
      )}
    </div>
  );
}

function ChipFiltro({ texto, onQuitar }: { texto: string; onQuitar: () => void }) {
  return (
    <button className="acc-chip-filtro" onClick={onQuitar} aria-label={`Quitar filtro ${texto}`}>
      {texto} <IconoCerrar tamano={10} />
    </button>
  );
}
