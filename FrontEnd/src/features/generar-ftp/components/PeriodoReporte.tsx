// react
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
// propios
import type { PeriodoFtp } from '@/types/api/indicadores/ftp';
import type { TipoReporte } from '@/types/pantallas/generarFtp';
import { IconoActividad, IconoCalendarioAnio, IconoCalendarioMes, IconoPalomita, IconoReloj } from '@/components/icons';
import { aniosHastaHoy } from '@/utils/anios';

interface Props {
  tipo: TipoReporte;
  datos: PeriodoFtp;
  mesesDisponibles: [string, string][];
  catColor: string;
  esVisor: boolean;
  style?: CSSProperties;
  onTipoChange: (tipo: TipoReporte) => void;
  onDatosChange: Dispatch<SetStateAction<PeriodoFtp>>;
}

/** Tipo (previo/final), año, mes y semana del reporte a generar. */
const PeriodoReporte = ({ tipo, datos, mesesDisponibles, catColor, esVisor, style, onTipoChange, onDatosChange }: Props) => (
  <div className="ind-period-block" style={style}>
    <p className="ind-period-label">
      <IconoReloj strokeWidth="2.5" />
      Período del reporte
    </p>

    {!esVisor && (
      <div className="cfg-tabs">
        <button
          className={`cfg-tab ${tipo === 'previo' ? 'cfg-tab--active' : ''}`}
          style={tipo === 'previo' ? { background: catColor, borderColor: catColor } : {}}
          onClick={() => { onTipoChange('previo'); onDatosChange(p => ({ ...p, semana: '1' })); }}
        >
          <IconoReloj tamano={12} strokeWidth="2" />
          Previo
        </button>
        <button
          className={`cfg-tab ${tipo === 'final' ? 'cfg-tab--active' : ''}`}
          style={tipo === 'final' ? { background: catColor, borderColor: catColor } : {}}
          onClick={() => { onTipoChange('final'); onDatosChange(p => ({ ...p, semana: null })); }}
        >
          <IconoPalomita tamano={12} strokeWidth="2" />
          Final
        </button>
      </div>
    )}

    <div className="cfg-fields">
      <div className="cfg-field">
        <label className="cfg-label">Año</label>
        <div className="cfg-select-wrap">
          <IconoCalendarioAnio className="cfg-select-icon" />
          <select className="cfg-select" value={datos.ano}
            onChange={e => onDatosChange({ ...datos, ano: e.target.value, mes: '' })}>
            {aniosHastaHoy(1).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className="cfg-field">
        <label className="cfg-label">Mes</label>
        <div className="cfg-select-wrap">
          <IconoCalendarioMes className="cfg-select-icon" />
          <select className="cfg-select" value={datos.mes}
            onChange={e => onDatosChange({ ...datos, mes: e.target.value })}>
            <option value="">Seleccionar mes…</option>
            {mesesDisponibles.map(([val, name]) => (
              <option key={val} value={val}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {tipo === 'previo' && !esVisor && (
        <div className="cfg-field cfg-field-full">
          <label className="cfg-label">Semana Epidemiológica</label>
          <div className="cfg-select-wrap">
            <IconoActividad tamano={13} className="cfg-select-icon" strokeWidth="2" />
            <select className="cfg-select" value={datos.semana || ''}
              onChange={e => onDatosChange({ ...datos, semana: e.target.value })}>
              {[1, 2, 3, 4, 5].map(s => (
                <option key={s} value={s.toString()}>Semana {s}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  </div>
)

export default PeriodoReporte
