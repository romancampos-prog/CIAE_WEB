// react
import { useState, type KeyboardEvent } from 'react';
// propios
import { IconoPalomita } from '@/components/icons';
import ArchivoUnidadIaas from './ArchivoUnidadIaas';
import type { EstadoGenerarIaas } from '@/features/generar-iaas/hooks/useGenerarIaas';

/**
 * Flechas para moverse por la cuadrícula de denominadores sin soltar el teclado: arriba/abajo
 * cambian de unidad (mismo indicador); izquierda/derecha se quedan en la misma unidad.
 */
const moverEnCuadricula = (e: KeyboardEvent<HTMLInputElement>, fila: number, columna: number, columnas: number) => {
  const esVertical   = e.key === 'ArrowDown' || e.key === 'ArrowUp';
  const esHorizontal = e.key === 'ArrowLeft' || e.key === 'ArrowRight';
  if (!esVertical && !esHorizontal) return;
  if (e.key === 'ArrowRight' && columna >= columnas - 1) return;
  if (e.key === 'ArrowLeft'  && columna <= 0) return;

  e.preventDefault();
  const inputs = document.querySelectorAll<HTMLInputElement>('.ia-num');
  const idx  = fila * columnas + columna;
  const next = e.key === 'ArrowDown'  ? idx + columnas
             : e.key === 'ArrowUp'    ? idx - columnas
             : e.key === 'ArrowRight' ? idx + 1
             :                          idx - 1;
  inputs[next]?.focus();
};

/** Captura en escritorio: unidades × (Excel numerador | denominadores IAAS 02–06). El Excel global de IAAS 01 va arriba (TarjetaGlobalIaas). */
const TablaCapturaIaas = ({ iaas }: { iaas: EstadoGenerarIaas }) => {
  const [sobreUnidad, setSobreUnidad]   = useState<string | null>(null);
  const { unidades, indicadores, archivosUnidad } = iaas;

  return (
    <table className="ia-table">
      <thead>
        <tr>
          <th rowSpan={2} className="ia-col-unidad">Unidad</th>
          <th rowSpan={2} className="ia-col-num">
            Excel numerador
            <small>IAAS 01 – 06</small>
          </th>
          <th colSpan={indicadores.length} className="ia-col-grupo">Denominadores</th>
        </tr>
        <tr>
          {indicadores.map((d) => (
            <th key={d.indicador} className="ia-col-denom">
              <span className="ia-th-ind">{d.indicador}</span>
              <small>{d.columnaDenominador}</small>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {unidades.map((u, i) => {
          const okNum = !!archivosUnidad[u];
          return (
            <tr key={u} className={`ia-tr ${iaas.denominadoresCompletos(u) && okNum ? 'ia-tr--ok' : ''}`} style={{ animationDelay: `${i * 0.02}s` }}>
              <td className="ia-td-unidad">
                <div className="ia-td-unidad-inner">
                  <span className={`ia-row-status ${okNum ? 'ia-row-status--ok' : ''}`}>
                    {okNum ? <IconoPalomita tamano={10} /> : <span className="ia-row-dot" />}
                  </span>
                  <span className="ia-unit-name">{u}</span>
                </div>
              </td>

              <td
                className={`ia-td-num ${sobreUnidad === u ? 'ia-td-num--over' : ''}`}
                onDragOver={e => { e.preventDefault(); setSobreUnidad(u); }}
                onDragLeave={() => setSobreUnidad(null)}
                onDrop={e => { e.preventDefault(); setSobreUnidad(null); iaas.elegirArchivoUnidad(u, e.dataTransfer.files[0]); }}
              >
                <ArchivoUnidadIaas
                  archivo={archivosUnidad[u]}
                  textoSubir="Subir"
                  onElegir={archivo => iaas.elegirArchivoUnidad(u, archivo)}
                  onQuitar={() => iaas.quitarArchivoUnidad(u)}
                />
              </td>

              {indicadores.map((d, j) => {
                const valor = iaas.denominadorDe(u, d.indicador);
                return (
                  <td key={d.indicador} className="ia-td-denom">
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`ia-num ${valor !== '' ? 'ia-num--lleno' : ''}`}
                      placeholder="—"
                      value={valor}
                      onChange={e => {
                        // type="number" no bloqueaba letras en todos los navegadores: solo dígitos y un punto.
                        const v = e.target.value;
                        if (v === '' || /^\d*\.?\d*$/.test(v)) iaas.capturarDenominador(u, d.indicador, v);
                      }}
                      onKeyDown={e => moverEnCuadricula(e, i, j, indicadores.length)}
                    />
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default TablaCapturaIaas;
