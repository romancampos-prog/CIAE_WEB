// propios
import type { ConteoValor } from '@/types/api/epidemiologia/ftp';
import type { FiltrosAcciones as Filtros } from '@/types/pantallas/acciones';
import { IconoBuscar, IconoCerrar } from '@/components/icons';

interface Props {
  filtros: Filtros;
  columnaClave: string | null;
  claves: ConteoValor[];
  unidades: ConteoValor[];
  total: number;
  visibles: number;
  onCambiar: (cambios: Partial<Filtros>) => void;
  onLimpiar: () => void;
}

/** Búsqueda libre (NSS, nombre, fecha...), la clave del filtro del mapeo y, si hay varias, la unidad; abajo, los filtros activos para quitarlos uno por uno. */
export default function FiltrosAcciones({ filtros, columnaClave, claves, unidades, total, visibles, onCambiar, onLimpiar }: Props) {
  const hayFiltros = !!(filtros.texto || filtros.clave || filtros.unidad);

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

        {columnaClave && (
          <label className="acc-selector">
            <span className="acc-selector-etiqueta">{columnaClave}</span>
            <select value={filtros.clave} onChange={e => onCambiar({ clave: e.target.value })}>
              <option value="">Todas</option>
              {claves.map(c => <option key={c.valor ?? ''} value={c.valor ?? ''}>{c.valor}</option>)}
            </select>
          </label>
        )}

        {unidades.length > 1 && (
          <label className="acc-selector">
            <span className="acc-selector-etiqueta">Unidad</span>
            <select value={filtros.unidad} onChange={e => onCambiar({ unidad: e.target.value })}>
              <option value="">Todas</option>
              {unidades.map(u => <option key={u.valor ?? ''} value={u.valor ?? ''}>{u.valor}</option>)}
            </select>
          </label>
        )}

        <span className="acc-contador">
          <strong>{visibles.toLocaleString('es-MX')}</strong>
          {visibles !== total && <> de {total.toLocaleString('es-MX')}</>} registros
        </span>
      </div>

      {hayFiltros && (
        <div className="acc-filtros-activos">
          {filtros.texto && <ChipFiltro texto={`“${filtros.texto}”`} onQuitar={() => onCambiar({ texto: '' })} />}
          {filtros.clave && <ChipFiltro texto={filtros.clave} onQuitar={() => onCambiar({ clave: '' })} />}
          {filtros.unidad && <ChipFiltro texto={filtros.unidad} onQuitar={() => onCambiar({ unidad: '' })} />}
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
