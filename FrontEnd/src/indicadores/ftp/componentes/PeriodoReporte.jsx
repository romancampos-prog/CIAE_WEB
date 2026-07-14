const PeriodoReporte = ({ tipo, datos, mesesDisponibles, catColor, esVisor, style, onTipoChange, onDatosChange }) => (
  <div className="ind-period-block" style={style}>
    <p className="ind-period-label">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      Período del reporte
    </p>

    {!esVisor && (
      <div className="cfg-tabs">
        <button
          className={`cfg-tab ${tipo === 'previo' ? 'cfg-tab--active' : ''}`}
          style={tipo === 'previo' ? { background: catColor, borderColor: catColor } : {}}
          onClick={() => { onTipoChange('previo'); onDatosChange(p => ({ ...p, semana: '1' })); }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Previo
        </button>
        <button
          className={`cfg-tab ${tipo === 'final' ? 'cfg-tab--active' : ''}`}
          style={tipo === 'final' ? { background: catColor, borderColor: catColor } : {}}
          onClick={() => { onTipoChange('final'); onDatosChange(p => ({ ...p, semana: null })); }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Final
        </button>
      </div>
    )}

    <div className="cfg-fields">
      <div className="cfg-field">
        <label className="cfg-label">Año</label>
        <div className="cfg-select-wrap">
          <svg className="cfg-select-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          </svg>
          <select className="cfg-select" value={datos.ano}
            onChange={e => onDatosChange({ ...datos, ano: e.target.value, mes: '' })}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </div>

      <div className="cfg-field">
        <label className="cfg-label">Mes</label>
        <div className="cfg-select-wrap">
          <svg className="cfg-select-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
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
            <svg className="cfg-select-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
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
