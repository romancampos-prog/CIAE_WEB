// react
import { useState } from 'react';
// propios
import { CheckIcon } from '@/components/ui/Iconos';
import ArchivoUnidadIaas from './ArchivoUnidadIaas';
import ExcelGlobalIaas from './ExcelGlobalIaas';
import type { EstadoGenerarIaas } from '@/features/generar-iaas/hooks/useGenerarIaas';

/**
 * Captura en mobile: una tarjeta por unidad en vez de la tabla ancha (mismos datos, solo cambia
 * el markup; .ia-mobile-cards está oculto fuera de mobile).
 */
const TarjetasCapturaIaas = ({ iaas }: { iaas: EstadoGenerarIaas }) => {
  const [sobreGlobal, setSobreGlobal] = useState(false);
  const [sobreUnidad, setSobreUnidad] = useState<string | null>(null);
  const { unidades, indicadores, archivosUnidad, excelGlobal } = iaas;

  return (
    <div className="ia-mobile-cards">

      <div
        className={`ia-mcard-global ${sobreGlobal ? 'ia-mcard-global--over' : ''} ${excelGlobal ? 'ia-mcard-global--done' : ''}`}
        onDragOver={e => { e.preventDefault(); setSobreGlobal(true); }}
        onDragLeave={() => setSobreGlobal(false)}
        onDrop={e => { e.preventDefault(); setSobreGlobal(false); iaas.elegirExcelGlobal(e.dataTransfer.files[0]); }}
      >
        <ExcelGlobalIaas
          archivo={excelGlobal}
          nota={`IAAS 01 — un solo archivo para las ${unidades.length} unidades`}
          onElegir={iaas.elegirExcelGlobal}
        />
      </div>

      {iaas.cargando ? (
        <div className="ia-shimmer-stack">
          {[1,2,3,4].map(i => <div key={i} className="ia-shimmer-row" />)}
        </div>
      ) : unidades.map(u => {
        const okNum = !!archivosUnidad[u];
        return (
          <div key={u} className={`ia-mcard ${iaas.denominadoresCompletos(u) && okNum ? 'ia-mcard--ok' : ''}`}>
            <div className="ia-mcard-header">
              <span className={`ia-row-status ${okNum ? 'ia-row-status--ok' : ''}`}>
                {okNum ? <CheckIcon size={10} /> : <span className="ia-row-dot" />}
              </span>
              <span className="ia-unit-name">{u}</span>
            </div>

            <div
              className={`ia-mcard-num ${sobreUnidad === u ? 'ia-mcard-num--over' : ''}`}
              onDragOver={e => { e.preventDefault(); setSobreUnidad(u); }}
              onDragLeave={() => setSobreUnidad(null)}
              onDrop={e => { e.preventDefault(); setSobreUnidad(null); iaas.elegirArchivoUnidad(u, e.dataTransfer.files[0]); }}
            >
              <ArchivoUnidadIaas
                archivo={archivosUnidad[u]}
                textoSubir="Subir Excel numerador"
                onElegir={archivo => iaas.elegirArchivoUnidad(u, archivo)}
                onQuitar={() => iaas.quitarArchivoUnidad(u)}
              />
            </div>

            <div className="ia-mcard-denoms">
              {indicadores.map(d => {
                const valor = iaas.denominadorDe(u, d.indicador);
                return (
                  <label key={d.indicador} className="ia-mcard-denom-field">
                    <span className="ia-mcard-denom-label" title={d.columnaDenominador}>{d.indicador}</span>
                    <input
                      type="number"
                      className={`ia-num ${valor !== '' ? 'ia-num--lleno' : ''}`}
                      placeholder="—"
                      min="0"
                      value={valor}
                      onChange={e => iaas.capturarDenominador(u, d.indicador, e.target.value)}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TarjetasCapturaIaas;
