// react
import { useRef, useState, type KeyboardEvent } from 'react';
// propios
import type { IndicadorGenerarIaas, SesionIaas } from '@/types/api/indicadores/iaas';
import { IconoAlerta, IconoArchivo, IconoCandado, IconoCerrar, IconoFlechaDerecha, IconoReloj, IconoSubirNube } from '@/components/icons';
import ModalConfirmarPassword from '@/components/ui/modal/ModalConfirmarPassword';
import { MESES_LARGOS } from '@/features/indicadores';
import { useUnidadTardia } from '@/features/generar-iaas/hooks/useUnidadTardia';
import './modalUnidadTardia.css';

interface Props {
  onClose: () => void;
  anio: string;
  mes: string;
  unidades: string[];
  /** Todos los indicadores IAAS (del backend). */
  todosIndicadores: string[];
  sesion: SesionIaas | null;
  /** Los que capturan denominador, para el rótulo de su columna. */
  indicadoresInfo: IndicadorGenerarIaas[];
  onSuccess: () => void;
}

interface PropsZona {
  etiqueta: string;
  opcional: boolean;
  archivo: File | null;
  onElegir: (archivo: File | undefined) => void;
  onQuitar: () => void;
}

/** Zona para soltar/elegir un Excel, con el chip del archivo elegido. */
const ZonaExcel = ({ etiqueta, opcional, archivo, onElegir, onQuitar }: PropsZona) => {
  const [encima, setEncima] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  return (
    <div className="mut-field">
      <label className="mut-label">
        {etiqueta}
        {opcional && <span className="mut-label-opt"> — opcional</span>}
      </label>
      <div
        className={`mut-drop ${encima ? 'mut-drop--over' : ''} ${archivo ? 'mut-drop--done' : ''}`}
        onDragOver={e => { e.preventDefault(); setEncima(true); }}
        onDragLeave={() => setEncima(false)}
        onDrop={e => { e.preventDefault(); setEncima(false); onElegir(e.dataTransfer.files[0]); }}
        onClick={() => !archivo && entrada.current?.click()}
      >
        <input ref={entrada} type="file" accept=".xlsx" hidden onChange={e => onElegir(e.target.files?.[0])} />
        {archivo ? (
          <div className="mut-file-chip">
            <IconoArchivo />
            <span>{archivo.name.replace('.xlsx', '')}</span>
            <button className="mut-chip-x" onClick={e => { e.stopPropagation(); onQuitar(); }}><IconoCerrar strokeLinejoin="round" /></button>
          </div>
        ) : (
          <span className="mut-drop-label"><IconoSubirNube /> Subir o arrastrar .xlsx</span>
        )}
      </div>
    </div>
  );
};

// Arriba/abajo entre denominadores: una sola columna, así que se busca la posición real entre
// los visibles (IAAS 01 no tiene este campo y puede quedar en medio de los seleccionados).
const moverEntreDenominadores = (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  const inputs = document.querySelectorAll<HTMLInputElement>('.mut-den-input');
  const pos    = Array.prototype.indexOf.call(inputs, e.target);
  const next   = e.key === 'ArrowDown' ? pos + 1 : pos - 1;
  inputs[next]?.focus();
};

/** Completar los datos de una unidad que entregó fuera de tiempo. Se monta solo mientras está abierto. */
export default function ModalUnidadTardia({ onClose, anio, mes, unidades, todosIndicadores, sesion, indicadoresInfo, onSuccess }: Props) {
  const tardia = useUnidadTardia({ anio, mes, todosIndicadores, sesion, alTerminar: onSuccess, onClose });
  const { unidad, seleccionados } = tardia;

  const mesLabel = MESES_LARGOS[mes] || mes;
  const otrasUnidades = tardia.otrasUnidades(unidades);
  const indsAMostrar = unidad ? tardia.indicadoresDeUnidad(unidad) : todosIndicadores;

  const filaUnidad = (u: string, conChips: boolean) => (
    <label key={u} className={`mut-unidad-row ${unidad === u ? 'mut-unidad-row--sel' : ''}`}>
      <input type="radio" hidden value={u} checked={unidad === u} onChange={() => tardia.elegirUnidad(u)} />
      <span className="mut-unidad-name">{u}</span>
      {conChips && (
        <div className="mut-unidad-chips">
          {tardia.indicadoresDeUnidad(u).map(ind => (
            <span key={ind} className="mut-unidad-chip">{ind.replace('IAAS ', '')}</span>
          ))}
        </div>
      )}
    </label>
  );

  return (
    <div className="mut-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mut-modal">

        {/* Header */}
        <div className="mut-header">
          <div className="mut-header-left">
            <div className="mut-icon-wrap">
              <IconoReloj tamano={16} />
            </div>
            <div>
              <p className="mut-title">Completar unidad tardía</p>
              <p className="mut-sub">IAAS — {mesLabel} {anio}</p>
            </div>
          </div>
          <button className="mut-close" onClick={onClose}><IconoCerrar strokeLinejoin="round" /></button>
        </div>

        <div className="mut-body">

          {/* Selector de unidad unificado */}
          <div className="mut-field">
            <label className="mut-label">Unidad</label>
            <div className="mut-unidad-list">
              {tardia.unidadesPendientes.length > 0 && (
                <div className="mut-unidad-sep">Pendientes</div>
              )}
              {tardia.unidadesPendientes.map(u => filaUnidad(u, true))}
              {otrasUnidades.length > 0 && (
                <>
                  <div className="mut-unidad-sep">Todas las unidades</div>
                  {otrasUnidades.map(u => filaUnidad(u, false))}
                </>
              )}
            </div>
          </div>

          {/* Paso 1: selección de indicadores con chips */}
          <div className="mut-field">
            <label className="mut-label">¿Qué indicadores vas a editar?</label>
            <div className="mut-ind-chips">
              {indsAMostrar.map(ind => (
                <label key={ind} className={`mut-ind-chip ${seleccionados.has(ind) ? 'mut-ind-chip--on' : ''}`}>
                  <input type="checkbox" hidden checked={seleccionados.has(ind)} onChange={() => tardia.alternarIndicador(ind)} />
                  {ind}
                </label>
              ))}
            </div>
          </div>

          {/* Paso 2: detalles de los indicadores seleccionados */}
          {seleccionados.size > 0 && (
            <div className="mut-field">
              <label className="mut-label">Datos actuales</label>
              <div className="mut-det-table">
                <div className="mut-det-row mut-det-row--head">
                  <span className="mut-det-ind">Indicador</span>
                  <span className="mut-ind-num">Numerador (Excel)</span>
                  <span className="mut-den-head">Denominador</span>
                </div>
                {[...seleccionados].map(ind => {
                  const numGuardado = tardia.numeradorGuardado(ind);
                  const tieneNum    = numGuardado != null;
                  const esIAAS01    = ind === 'IAAS 01';
                  const info        = indicadoresInfo.find(i => i.indicador === ind);
                  const denGuardado = esIAAS01 ? tardia.denominadorGuardado(ind) : undefined;
                  const tieneDen    = denGuardado != null;
                  return (
                    <div key={ind} className="mut-det-row">
                      <span className="mut-det-ind">{ind}</span>
                      <span className={`mut-ind-num ${tieneNum ? '' : 'mut-ind-num--miss'}`}>
                        {tieneNum ? numGuardado : 'falta'}
                      </span>
                      {!esIAAS01 ? (
                        <span className="mut-den-wrap">
                          <input
                            type="number" min="0" className="mut-den-input"
                            placeholder={info?.columnaDenominador ? info.columnaDenominador.slice(0, 16) : 'Denominador'}
                            value={tardia.denoms[ind] ?? ''}
                            disabled={tardia.sinDato.has(ind)}
                            onChange={e => tardia.capturarDenominador(ind, e.target.value)}
                            onKeyDown={moverEntreDenominadores}
                          />
                          <label className="mut-sindato" title="Marca si esta unidad no tiene dato para este indicador (queda en Gris)">
                            <input type="checkbox" checked={tardia.sinDato.has(ind)} onChange={() => tardia.alternarSinDato(ind)} />
                            Sin dato
                          </label>
                        </span>
                      ) : tardia.excelDenIaas01 ? (
                        <span className="mut-ind-den-auto" title="Se recalculará con el Excel de denominador que subiste abajo.">
                          se recalcula ({tardia.excelDenIaas01.name.replace('.xlsx', '')})
                        </span>
                      ) : (
                        <span className="mut-ind-den-auto-wrap" title="Se autocalcula con el Excel del denominador, no se edita a mano.">
                          <span className="mut-ind-den-box">
                            {tieneDen ? denGuardado : '—'}
                          </span>
                          <IconoCandado tamano={11} strokeWidth="2.2" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Excel */}
          <div className="mut-excel-row">
            <ZonaExcel
              etiqueta="Excel Numerador"
              opcional={!!unidad && !tardia.excelRequerido}
              archivo={tardia.excelUnidad}
              onElegir={tardia.elegirExcelUnidad}
              onQuitar={tardia.quitarExcelUnidad}
            />

            {/* Excel del denominador — solo para IAAS 01 */}
            {tardia.iaas01Elegido && (
              <ZonaExcel
                etiqueta="Excel Denominador (IAAS 01)"
                opcional={!tardia.excelDenRequerido}
                archivo={tardia.excelDenIaas01}
                onElegir={tardia.elegirExcelDenIaas01}
                onQuitar={tardia.quitarExcelDenIaas01}
              />
            )}
          </div>

          {/* Warning */}
          {unidad && (
            <div className="mut-warning">
              <IconoAlerta tamano={13} />
              Sobreescribirá los datos de <strong>&nbsp;{unidad}&nbsp;</strong> para {mesLabel} {anio}
            </div>
          )}

          {tardia.error && <p className="mut-error">{tardia.error}</p>}
        </div>

        {/* Footer */}
        <div className="mut-footer">
          <button className="mut-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="mut-btn-confirm" onClick={tardia.confirmar}>
            Confirmar
            <IconoFlechaDerecha tamano={13} />
          </button>
        </div>
      </div>

      <ModalConfirmarPassword
        isOpen={tardia.mostrarConfirmar}
        onClose={tardia.cerrarConfirmar}
        onConfirm={tardia.enviar}
        enviando={tardia.enviando}
        error={tardia.errorPassword}
        color="var(--color-tinto-gobierno)"
        confirmLabel={tardia.enviando ? 'Actualizando…' : 'Confirmar'}
        infoRows={[
          { label: 'Unidad', value: unidad },
          { label: 'Indicadores', value: [...seleccionados].join(', ') },
        ]}
      />
    </div>
  );
}
