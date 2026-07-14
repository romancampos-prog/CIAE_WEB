const SidebarCategorias = ({ allIndicadores, cargandoLista, categoria, indicadorSel, abiertas, onToggle, onSelectIndicador }) => (
  <aside className="ind-sidebar">
    <p className="ind-sidebar-label">Categorías</p>
    <div className="ind-cat-list">
      {cargandoLista
        ? [1,2,3,4,5].map(i => <div key={i} className="ind-cat-shimmer" />)
        : Object.keys(allIndicadores).map(cat => {
            const abierto  = abiertas.has(cat)
            const esActiva = categoria === cat
            const cc       = allIndicadores[cat]?.color
            const catInds  = allIndicadores[cat]?.indicadores ?? []
            return (
              <div key={cat} className="ind-cat-group">
                <button
                  className={`ind-cat-btn ${esActiva ? 'ind-cat-btn--active' : ''} ${abierto ? 'ind-cat-btn--open' : ''}`}
                  style={esActiva ? { '--cc': cc } : {}}
                  onClick={() => onToggle(cat)}
                >
                  <span>{cat}</span>
                  <div className="ind-cat-btn-meta">
                    <span className="ind-cat-count">{catInds.length}</span>
                    <svg
                      width="10" height="10" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      className={`ind-cat-chevron ${abierto ? 'ind-cat-chevron--open' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {abierto && (
                  <div className="ind-ind-list ind-ind-list--accordion" style={{ '--acc-color': cc }}>
                    {catInds.map(ind => (
                      <button
                        key={ind}
                        className={`ind-ind-btn ${indicadorSel === ind ? 'ind-ind-btn--active' : ''}`}
                        style={indicadorSel === ind ? { '--cc': cc } : {}}
                        onClick={() => onSelectIndicador(cat, ind)}
                      >
                        <span className="ind-ind-name">{ind}</span>
                        {indicadorSel === ind && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })
      }
    </div>
  </aside>
)

export default SidebarCategorias
