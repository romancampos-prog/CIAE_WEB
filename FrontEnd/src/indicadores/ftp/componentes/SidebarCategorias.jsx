/**
 * Sidebar de categorías/indicadores.
 * - Desktop/tablet: colapsa a un riel angosto (solo el código de categoría),
 *   mismo patrón que el sidebar de Epidemiología — siempre visible, en flujo.
 * - Mobile (ver media query en indicadores.css): en vez de un riel permanente,
 *   se oculta del todo y aparece como un chip flotante con la categoría activa;
 *   al tocarlo, el panel se desliza como overlay sobre el contenido.
 * @param {{ collapsed: boolean, onToggleCollapse: Function }} props
 */
const SidebarCategorias = ({
  allIndicadores, cargandoLista, categoria, indicadorSel, abiertas,
  onToggle, onSelectIndicador, collapsed, onToggleCollapse,
}) => {
  const colorActiva = allIndicadores[categoria]?.color

  const seleccionar = (cat, ind) => {
    onSelectIndicador(cat, ind)
    // En mobile el panel es un overlay: se cierra solo al elegir un indicador
    if (!collapsed && typeof window !== 'undefined' && window.innerWidth <= 768) {
      onToggleCollapse()
    }
  }

  return (
    <>
      {/* Chip flotante — solo visible en mobile mientras el panel está cerrado */}
      {collapsed && (
        <button
          type="button"
          className="ind-sidebar-trigger"
          style={{ '--cc': colorActiva }}
          onClick={onToggleCollapse}
        >
          <span className="ind-sidebar-trigger-label">Categoría</span>
          <span className="ind-sidebar-trigger-value">{categoria || '…'}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Backdrop — solo se activa en mobile cuando el overlay está abierto */}
      <div
        className={`ind-sidebar-backdrop${collapsed ? '' : ' ind-sidebar-backdrop--show'}`}
        onClick={onToggleCollapse}
        aria-hidden="true"
      />

      <aside className={`ind-sidebar${collapsed ? ' ind-sidebar--collapsed' : ''}`}>

        <button
          type="button"
          className="ind-sidebar-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: 'transform 0.3s', transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {!collapsed && <p className="ind-sidebar-label">Categorías</p>}

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
                      title={collapsed ? cat : ''}
                      onClick={() => {
                        if (collapsed) onToggleCollapse()
                        onToggle(cat)
                      }}
                    >
                      <span>{cat}</span>
                      {!collapsed && (
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
                      )}
                    </button>

                    {abierto && !collapsed && (
                      <div className="ind-ind-list ind-ind-list--accordion" style={{ '--acc-color': cc }}>
                        {catInds.map(ind => (
                          <button
                            key={ind}
                            className={`ind-ind-btn ${indicadorSel === ind ? 'ind-ind-btn--active' : ''}`}
                            style={indicadorSel === ind ? { '--cc': cc } : {}}
                            onClick={() => seleccionar(cat, ind)}
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
    </>
  )
}

export default SidebarCategorias
