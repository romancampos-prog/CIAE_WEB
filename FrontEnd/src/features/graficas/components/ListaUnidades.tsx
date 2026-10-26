// react
import { useState } from 'react';
// propios
import { COLOR_SEMAFORO } from '@/features/graficas/constants/semaforo';
import { CLAVE_ESTATAL, formatoNumero, nombreUnidad } from '@/features/graficas/utils/datosGrafica';
import type { Desempeno, FilaUnidad } from '@/features/graficas/tipos';

// Mismo distintivo que tenía el panel de unidades anterior: el color dice el nivel y el signo lo repite.
const SIGNO: Record<Desempeno, string> = { Esperado: '✓', Medio: '!', Bajo: '!', Gris: '?' };

interface Props {
  filas: FilaUnidad[];
  estatal: FilaUnidad | null;
  unidadSel: string;
  grupoDeUnidad?: Record<string, string> | null;
  onElegir: (unidad: string) => void;
}

/**
 * Lista de unidades para elegir cuál ver en Tendencia: el estatal aparte, al final, como
 * en el panel anterior, y las unidades con su resultado y el distintivo de su semáforo en
 * el mes elegido.
 *
 * Props:
 *   filas      — [{ unidad, resultado, desempeno }] del mes (sin el estatal)
 *   estatal    — fila del estatal o null
 *   unidadSel  — unidad activa
 *   grupoDeUnidad — { unidad: grupo } o null (IAAS 01)
 *   onElegir   — fn(unidad)
 */
const ListaUnidades = ({ filas, estatal, unidadSel, grupoDeUnidad, onElegir }: Props) => {
  const [busqueda, setBusqueda] = useState('');
  const lista = filas.filter(f => f.unidad.toLowerCase().includes(busqueda.toLowerCase()));

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
        <span className="gi-lista-nombre">{fila.unidad === CLAVE_ESTATAL ? 'TOTAL OOAD' : fila.unidad}</span>
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
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
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
