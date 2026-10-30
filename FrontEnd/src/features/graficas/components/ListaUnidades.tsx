// react
import { useState } from 'react';
// propios
import type { Desempeno, TipoMeta } from '@/types/api/indicadores/reportes';
import type { FilaUnidad } from '@/types/pantallas/graficas';
import { IconoBuscar } from '@/components/icons';
import { COLOR_SEMAFORO } from '@/features/graficas/constants/semaforo';
import { CLAVE_ESTATAL, formatoNumero, nombreUnidad, ordenarPorResultado } from '@/features/graficas/utils/datosGrafica';

// Mismo distintivo que tenía el panel de unidades anterior: el color dice el nivel y el signo lo repite.
const SIGNO: Record<Desempeno, string> = { Esperado: '✓', Medio: '!', Bajo: '!', Gris: '?' };

interface Props {
  filas: FilaUnidad[];
  estatal: FilaUnidad | null;
  unidadSel: string;
  grupoDeUnidad?: Record<string, string> | null;
  /** Con meta "mas" o "menos" la lista va por lugar (#1 = la mejor); en rangos no hay lugar. */
  tipoMeta?: TipoMeta;
  onElegir: (unidad: string) => void;
}

/**
 * Lista de unidades para elegir cuál ver en Tendencia: el estatal aparte, al final, y las
 * unidades con su lugar en el ranking (#1 = la mejor, si la meta no es un rango), su resultado
 * y el distintivo de su semáforo en el mes elegido.
 *
 * Props:
 *   filas      — [{ unidad, resultado, desempeno }] del mes (sin el estatal)
 *   estatal    — fila del estatal o null
 *   unidadSel  — unidad activa
 *   grupoDeUnidad — { unidad: grupo } o null (IAAS 01)
 *   tipoMeta   — perfil.tipoMeta: ordena y numera por lugar
 *   onElegir   — fn(unidad)
 */
const ListaUnidades = ({ filas, estatal, unidadSel, grupoDeUnidad, tipoMeta, onElegir }: Props) => {
  const [busqueda, setBusqueda] = useState('');
  const conLugar = tipoMeta === 'mas' || tipoMeta === 'menos';
  const ordenadas = conLugar ? ordenarPorResultado(filas, tipoMeta) : filas;
  // El lugar se cuenta sobre todas las que tienen dato, antes de buscar
  const lugar = new Map(ordenadas.filter(f => f.resultado != null).map((f, i) => [f.unidad, i + 1]));
  const lista = ordenadas.filter(f => f.unidad.toLowerCase().includes(busqueda.toLowerCase()));

  const renglon = (fila: FilaUnidad) => {
    const activa = fila.unidad === unidadSel;
    const estado = fila.desempeno === 'Gris' ? 'Sin dato' : fila.desempeno;
    return (
      <button
        key={fila.unidad}
        type="button"
        aria-pressed={activa}
        className={`gi-lista-item${activa ? ' gi-lista-item--activa' : ''}${fila.unidad === CLAVE_ESTATAL ? ' gi-lista-item--estatal' : ''}`}
        onClick={() => onElegir(fila.unidad)}
        title={`${nombreUnidad(fila.unidad)}: ${estado}`}
      >
        <span className="gi-lista-nombre">
          {conLugar && lugar.has(fila.unidad) && <small className="gi-lista-lugar">#{lugar.get(fila.unidad)}</small>}
          {fila.unidad === CLAVE_ESTATAL ? 'TOTAL OOAD' : fila.unidad}
        </span>
        <span className="gi-lista-valor">
          {grupoDeUnidad?.[fila.unidad] && <small>{grupoDeUnidad[fila.unidad]}</small>}
          {formatoNumero(fila.resultado)}
          <span className="gi-lista-signo" style={{ background: COLOR_SEMAFORO[fila.desempeno] }} aria-label={estado}>
            {SIGNO[fila.desempeno] ?? '?'}
          </span>
        </span>
      </button>
    );
  };

  return (
    <aside className="gi-lista-unidades">
      <p className="gi-lista-titulo">Unidades</p>
      <label className="gi-buscar">
        <IconoBuscar aria-hidden />
        <input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar unidad…" aria-label="Buscar unidad" />
      </label>
      <div className="gi-lista-scroll">
        {lista.map(renglon)}
        {estatal && (
          <>
            <span className="gi-lista-separador" aria-hidden />
            {renglon(estatal)}
          </>
        )}
      </div>
    </aside>
  );
};

export default ListaUnidades;
