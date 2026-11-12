// react
import type { Dispatch, ReactNode, SetStateAction } from 'react';
// propios
import type { PeriodoFtp } from '@/types/api/indicadores/ftp';
import type { EstadoMes, TipoReporte } from '@/types/pantallas/generarFtp';
import { IconoActividad, IconoCalendarioAnio, IconoCalendarioMes, IconoCandadoChico, IconoGenerarTodos, IconoGuion, IconoInfo, IconoPalomita, IconoReloj } from '@/components/icons';
import { aniosHastaHoy } from '@/utils/anios';

interface Props {
  tipo: TipoReporte;
  datos: PeriodoFtp;
  meses: EstadoMes[];
  /** Cuándo se abre el mes en curso, si todavía no se puede elegir. */
  avisoMeses: string | null;
  catColor: string;
  esVisor: boolean;
  onTipoChange: (tipo: TipoReporte) => void;
  onDatosChange: Dispatch<SetStateAction<PeriodoFtp>>;
}

const ICONO_ESTADO: Record<EstadoMes['tipo'], ReactNode> = {
  disponible: <IconoGenerarTodos tamano={11} />,
  generado:   <IconoPalomita tamano={11} strokeWidth="3" />,
  cerrado:    <IconoCandadoChico tamano={11} />,
  espera:     <IconoReloj tamano={11} strokeWidth="2.5" />,
  futuro:     <IconoGuion tamano={11} />,
};

/** Tipo (previo/final), año, mes y semana del reporte a generar. */
const PeriodoReporte = ({ tipo, datos, meses, avisoMeses, catColor, esVisor, onTipoChange, onDatosChange }: Props) => (
  <div className="ind-period-block">
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

      {tipo === 'previo' && !esVisor && (
        <div className="cfg-field">
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

    <div className="cfg-field">
      <span className="cfg-label ind-meses-titulo" id="ind-meses-titulo"><IconoCalendarioMes /> Mes</span>
      <div className="ind-meses" role="group" aria-labelledby="ind-meses-titulo" style={{ '--cat': catColor }}>
        {meses.map(m => {
          const elegido = m.disponible && datos.mes === m.clave;
          return (
            <button
              key={m.clave}
              type="button"
              className={`ind-mes ind-mes--${m.tipo}${elegido ? ' ind-mes--elegido' : ''}${m.disponible ? '' : ' ind-mes--bloqueado'}`}
              disabled={!m.disponible}
              aria-pressed={elegido}
              onClick={() => onDatosChange({ ...datos, mes: m.clave })}
            >
              <strong>{m.nombre}</strong>
              <small>{elegido ? <IconoPalomita tamano={11} strokeWidth="3" /> : ICONO_ESTADO[m.tipo]}{elegido ? 'Elegido' : m.estado}</small>
            </button>
          );
        })}
      </div>
      {avisoMeses && <p className="ind-meses-aviso"><IconoInfo tamano={14} /> {avisoMeses}</p>}
    </div>
  </div>
)

export default PeriodoReporte
