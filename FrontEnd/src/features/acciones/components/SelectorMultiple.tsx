// react
import { useEffect, useRef, useState } from 'react';
// propios
import type { ConteoValor } from '@/types/api/epidemiologia/ftp';
import { IconoPalomita } from '@/components/icons';

interface Props {
  etiqueta: string;
  opciones: ConteoValor[];
  elegidos: string[];
  onCambiar: (elegidos: string[]) => void;
}

/** Select de varias opciones con casillas: nada elegido = todas. Cada opción muestra cuántos registros trae. */
export default function SelectorMultiple({ etiqueta, opciones, elegidos, onCambiar }: Props) {
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

  const alternar = (valor: string) =>
    onCambiar(elegidos.includes(valor) ? elegidos.filter(v => v !== valor) : [...elegidos, valor]);

  const resumen = elegidos.length === 0 ? 'Todas'
    : elegidos.length === 1 ? elegidos[0]
    : `${elegidos[0]} +${elegidos.length - 1}`;

  return (
    <div className="acc-multi" ref={caja}>
      <button
        type="button"
        className={`acc-selector acc-multi-boton${abierto ? ' acc-multi-boton--abierto' : ''}`}
        onClick={() => setAbierto(a => !a)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
      >
        <span className="acc-selector-etiqueta">{etiqueta}</span>
        <span className="acc-multi-resumen">{resumen}</span>
      </button>

      {abierto && (
        <div className="acc-multi-lista" role="listbox" aria-multiselectable="true" aria-label={etiqueta}>
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
      )}
    </div>
  );
}
