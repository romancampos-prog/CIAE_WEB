// propios
import type { FamiliaFtp } from '@/types/pantallas/generarFtp';
import { IconoCapas, IconoChevronAbajo, IconoChevronDerecha, IconoChevronIzquierda, IconoGenerarTodos, IconoListaBarras, IconoPalomita, IconoTendencia } from '@/components/icons';
import { urlIcono } from '@/features/indicadores';
import './sidebarCategorias.css';

interface Props {
  categorias: FamiliaFtp[];
  cargandoLista: boolean;
  categoria: string;
  indicadorSel: string | null;
  abierta: string | null;
  onToggle: (categoria: string) => void;
  onSelectIndicador: (categoria: string, indicador: string) => void;
  /** Volver a generar toda la categoría, sin indicador elegido. */
  onSelectTodos: (categoria: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * Sidebar de categorías/indicadores.
 * - Desktop/tablet: colapsa a un riel angosto (solo el código de categoría),
 *   mismo patrón que el sidebar de Epidemiología — siempre visible, en flujo.
 * - Mobile (ver media query en indicadores.css): en vez de un riel permanente,
 *   se oculta del todo y aparece como un chip flotante con la categoría activa;
 *   al tocarlo, el panel se desliza como overlay sobre el contenido.
 */
const SidebarCategorias = ({
  categorias, cargandoLista, categoria, indicadorSel, abierta,
  onToggle, onSelectIndicador, onSelectTodos, collapsed, onToggleCollapse,
}: Props) => {
  const colorActiva = categorias.find(c => c.categoriaIndicador === categoria)?.color

  // En mobile el panel es un overlay: se cierra solo al elegir
  const cerrarEnMovil = () => {
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
          <IconoChevronDerecha tamano={12} />
        </button>
      )}

      {/* Backdrop — solo se activa en mobile cuando el overlay está abierto */}
      <div
        className={`ind-sidebar-backdrop${collapsed ? '' : ' ind-sidebar-backdrop--show'}`}
        onClick={onToggleCollapse}
        aria-hidden="true"
      />

      <aside className={`ind-sidebar gf-sidebar${collapsed ? ' ind-sidebar--collapsed' : ''}`}>

        <button
          type="button"
          className="ind-sidebar-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          <IconoChevronIzquierda style={{ transition: 'transform 0.3s', transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>

        {!collapsed && <p className="ind-sidebar-label gf-etiqueta"><IconoListaBarras tamano={12} /> Categorías</p>}

        <div className="ind-cat-list">
          {cargandoLista
            ? [1,2,3,4,5].map(i => <div key={i} className="ind-cat-shimmer" />)
            : categorias.map(({ categoriaIndicador: cat, nombreCategoria, imagen, color: cc, indicadores: catInds }) => {
                const abierto  = abierta === cat
                const esActiva = categoria === cat
                const icono    = urlIcono(imagen)
                return (
                  <div key={cat} className="gf-cat-grupo" style={{ '--cc': cc }}>
                    <button
                      type="button"
                      className={`gf-cat${esActiva ? ' gf-cat--activa' : ''}`}
                      title={collapsed ? `${cat} · ${nombreCategoria}` : nombreCategoria}
                      aria-expanded={abierto}
                      onClick={() => {
                        if (collapsed) onToggleCollapse()
                        if (!collapsed || !esActiva) onToggle(cat)
                      }}
                    >
                      <span className="gf-cat-icono" aria-hidden="true">
                        {icono ? <img src={icono} alt="" /> : <IconoCapas tamano={16} />}
                      </span>
                      {!collapsed && (
                        <>
                          <span className="gf-cat-texto">
                            <strong>{cat}</strong>
                            <small>{nombreCategoria}</small>
                          </span>
                          <span className="gf-cat-cuenta">{catInds.length}</span>
                          <IconoChevronAbajo tamano={10} className={`gf-cat-flecha${abierto ? ' gf-cat-flecha--abierta' : ''}`} />
                        </>
                      )}
                    </button>

                    {abierto && !collapsed && (
                      <div className="gf-inds">
                        <button
                          type="button"
                          className={`gf-ind${esActiva && !indicadorSel ? ' gf-ind--activo' : ''}`}
                          aria-pressed={esActiva && !indicadorSel}
                          onClick={() => { onSelectTodos(cat); cerrarEnMovil() }}
                        >
                          <IconoGenerarTodos tamano={14} />
                          <span>Todos</span>
                        </button>
                        {catInds.map(ind => (
                          <button
                            key={ind}
                            type="button"
                            className={`gf-ind${indicadorSel === ind ? ' gf-ind--activo' : ''}`}
                            aria-pressed={indicadorSel === ind}
                            onClick={() => { onSelectIndicador(cat, ind); cerrarEnMovil() }}
                          >
                            <IconoTendencia tamano={14} />
                            <span>{ind}</span>
                            {indicadorSel === ind && <IconoPalomita tamano={11} strokeWidth="3" />}
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
