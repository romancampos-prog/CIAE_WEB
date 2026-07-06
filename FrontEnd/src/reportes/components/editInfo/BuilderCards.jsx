export function TerminoCard({ term, idx, chips, claves, pickerAbierto, onTogglePicker, onChangeFuente, onAddCol, onDelCol, onEliminar, mostrarEliminar }) {
  const chipsDisponibles = chips.filter(c => c.fId === term.fuenteId && !term.cols.includes(c.key));
  return (
    <div className="ei-grupo-card">
      <div className="ei-grupo-header">
        <span className="ei-grupo-num">Término {idx + 1}</span>
        {mostrarEliminar && (
          <button className="ei-fuente-btn-eliminar" onClick={onEliminar} title="Eliminar término">🗑</button>
        )}
      </div>

      <div className="ei-termino-fuente-row">
        <span className="ei-termino-fuente-label">Documento</span>
        <div className="ei-termino-fuente-pills">
          {claves.length === 0
            ? <span style={{ fontSize: '12px', color: '#ccc' }}>Sin fuentes configuradas</span>
            : claves.map(k => (
              <button key={k}
                className={`ei-fuente-pill ${term.fuenteId === k ? 'ei-fuente-pill--activo' : ''}`}
                onClick={() => onChangeFuente(k)}>
                {k}
              </button>
            ))
          }
        </div>
      </div>

      {term.fuenteId && (
        <div className="ei-grupo-cols">
          {term.cols.length === 0 && <span className="ei-grupo-empty">Sin columnas — añade con el botón</span>}
          {term.cols.map(key => {
            const chip = chips.find(c => c.key === key);
            if (!chip) return null;
            return (
              <span key={key} className="ei-col-chip ei-col-chip--sel ei-col-chip--sm">
                <span className="ei-col-chip-col">{chip.col}</span>
                <button className="ei-tag-remove" onClick={() => onDelCol(key)}>×</button>
              </span>
            );
          })}
          <div style={{ position: 'relative' }}>
            <button className="ei-grupo-add-col" onClick={onTogglePicker}>
              {pickerAbierto ? '✕' : '+ Columna'}
            </button>
            {pickerAbierto && (
              <div className="ei-col-picker">
                {chipsDisponibles.length === 0
                  ? <span style={{ fontSize: '11px', color: '#bbb' }}>No quedan columnas</span>
                  : chipsDisponibles.map(chip => (
                    <button key={chip.key} className="ei-col-chip ei-col-chip--sm" onClick={() => onAddCol(chip.key)}>
                      <span className="ei-col-chip-col">{chip.col}</span>
                    </button>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function GrupoCard({ grupo, idx, chips, pickerAbierto, onTogglePicker, onAddCol, onDelCol, onUpdate, onEliminar, mostrarEliminar }) {
  const disponibles = chips.filter(c => !grupo.cols.includes(c.key));
  return (
    <div className="ei-grupo-card">
      <div className="ei-grupo-header">
        <span className="ei-grupo-num">Grupo {idx + 1}</span>
        {mostrarEliminar && (
          <button className="ei-fuente-btn-eliminar" onClick={onEliminar} title="Eliminar grupo">🗑</button>
        )}
      </div>

      <div className="ei-grupo-cols">
        {grupo.cols.length === 0 && <span className="ei-grupo-empty">Sin columnas — añade con el botón</span>}
        {grupo.cols.map(key => {
          const chip = chips.find(c => c.key === key);
          if (!chip) return null;
          return (
            <span key={key} className="ei-col-chip ei-col-chip--sel ei-col-chip--sm">
              <span className="ei-col-chip-fuente">{chip.fId}</span>
              <span className="ei-col-chip-col">{chip.col}</span>
              <button className="ei-tag-remove" onClick={() => onDelCol(key)}>×</button>
            </span>
          );
        })}
        <div style={{ position: 'relative' }}>
          <button className="ei-grupo-add-col" onClick={onTogglePicker}>
            {pickerAbierto ? '✕' : '+ Columna'}
          </button>
          {pickerAbierto && (
            <div className="ei-col-picker">
              {disponibles.length === 0
                ? <span style={{ fontSize: '11px', color: '#bbb' }}>No quedan columnas disponibles</span>
                : disponibles.map(chip => (
                  <button key={chip.key} className="ei-col-chip ei-col-chip--sm" onClick={() => onAddCol(chip.key)}>
                    <span className="ei-col-chip-fuente">{chip.fId}</span>
                    <span className="ei-col-chip-col">{chip.col}</span>
                  </button>
                ))
              }
            </div>
          )}
        </div>
      </div>

      <div className="ei-grupo-prevalencia">
        <label className="ei-toggle-label">
          <input type="checkbox" checked={!!grupo.usaPrevalencia}
            onChange={e => onUpdate({ usaPrevalencia: e.target.checked, pct: '' })} />
          <span className="ei-toggle-track" />
        </label>
        <span className="ei-grupo-prev-label">Ajuste de prevalencia</span>
        {grupo.usaPrevalencia && (
          <div className="ei-prevalencia-input-wrap">
            <input className="ei-input ei-mono" type="number" min={0} max={100} step={0.01}
              value={grupo.pct} placeholder="0.0" style={{ maxWidth: '76px', textAlign: 'right' }}
              onChange={e => onUpdate({ pct: e.target.value })} />
            <span className="ei-prevalencia-pct">%</span>
            {grupo.pct && (
              <span className="ei-prevalencia-factor">
                = {(parseFloat(grupo.pct) / 100).toFixed(4).replace(/0+$/, '')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
