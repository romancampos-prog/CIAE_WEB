// propios
import type { ConteoValor } from '@/types/api/epidemiologia/ftp';
import { IconoBuscar, IconoCerrar, IconoPalomita } from '@/components/icons';

// Los controles que van dentro del panel de cada columna (FiltroColumna).

interface PropsLista {
  opciones: ConteoValor[];
  elegidos: string[];
  onCambiar: (elegidos: string[]) => void;
}

/** Lista con casillas (Unidad, Clave de la Acción): nada elegido = todas; cada opción dice cuántos registros trae. */
export function ListaOpciones({ opciones, elegidos, onCambiar }: PropsLista) {
  const alternar = (valor: string) =>
    onCambiar(elegidos.includes(valor) ? elegidos.filter(v => v !== valor) : [...elegidos, valor]);

  return (
    <div className="acc-multi-lista" role="listbox" aria-multiselectable="true">
      <button type="button" className="acc-multi-todas" onClick={() => onCambiar([])} disabled={elegidos.length === 0}>
        Quitar selección
      </button>
      {opciones.map(({ valor, cantidad }) => {
        const texto = valor ?? '';
        const elegido = elegidos.includes(texto);
        return (
          <button
            key={texto}
            type="button"
            role="option"
            aria-selected={elegido}
            className={`acc-multi-opcion${elegido ? ' acc-multi-opcion--elegida' : ''}`}
            onClick={() => alternar(texto)}
          >
            <span className="acc-multi-casilla" aria-hidden="true">{elegido && <IconoPalomita tamano={11} />}</span>
            <span className="acc-multi-texto">{texto || '(vacío)'}</span>
            <span className="acc-multi-cantidad">{cantidad}</span>
          </button>
        );
      })}
    </div>
  );
}

interface PropsRango {
  /** Fechas distintas que trae el mes, ya ordenadas. */
  fechas: string[];
  desde: string;
  hasta: string;
  onCambiar: (cambios: { desde?: string; hasta?: string }) => void;
}

/** Rango de fechas con solo las que llegaron; elegir un extremo equivale a no filtrar por ese lado. */
export function RangoFechas({ fechas, desde, hasta, onCambiar }: PropsRango) {
  // Cada lista solo ofrece lo que deja el rango coherente (desde ≤ hasta).
  const fechasDesde = hasta ? fechas.slice(0, fechas.indexOf(hasta) + 1) : fechas;
  const fechasHasta = desde ? fechas.slice(fechas.indexOf(desde)) : fechas;
  const primera = fechas[0] ?? '';
  const ultima  = fechas[fechas.length - 1] ?? '';

  return (
    <div className="acc-columna-rango">
      <label className="acc-campo">
        Desde
        <select className="acc-control" value={desde || primera} onChange={e => onCambiar({ desde: e.target.value === primera ? '' : e.target.value })}>
          {fechasDesde.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </label>
      <label className="acc-campo">
        Hasta
        <select className="acc-control" value={hasta || ultima} onChange={e => onCambiar({ hasta: e.target.value === ultima ? '' : e.target.value })}>
          {fechasHasta.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </label>
    </div>
  );
}

interface PropsBuscador {
  columna: string;
  texto: string;
  onCambiar: (texto: string) => void;
}

/** Buscador de una sola columna (NSS, nombre, agregado...): filtra mientras se escribe; Enter cierra el panel. */
export function BuscadorColumna({ columna, texto, onCambiar }: PropsBuscador) {
  return (
    <label className="acc-columna-buscar">
      <span className="acc-columna-buscar-icono" aria-hidden="true"><IconoBuscar tamano={14} /></span>
      <input
        autoFocus
        value={texto}
        onChange={e => onCambiar(e.target.value)}
        placeholder="Escribe para filtrar…"
        aria-label={`Buscar en ${columna}`}
      />
      {texto && (
        <button type="button" onClick={() => onCambiar('')} aria-label="Borrar búsqueda" title="Borrar">
          <IconoCerrar tamano={10} />
        </button>
      )}
    </label>
  );
}
