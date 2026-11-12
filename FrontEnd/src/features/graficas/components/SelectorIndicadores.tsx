// propios
import type { GrupoIndicadores } from '@/types/pantallas/graficas';
import { IconoCerrar } from '@/components/icons';

interface Props {
  grupos: GrupoIndicadores[];
  indicador: string;
  categoria: string | null;
  color: string;
  icono: string | null;
  drawerAbierto: boolean;
  abrirDrawer: () => void;
  cerrarDrawer: () => void;
  seleccionar: (indicador: string) => void;
}

/** Botón flotante con el indicador elegido y el drawer lateral con las familias (el maestro de Gráficas). */
const SelectorIndicadores = ({ grupos, indicador, categoria, color, icono, drawerAbierto, abrirDrawer, cerrarDrawer, seleccionar }: Props) => (
  <>
    {!drawerAbierto && (
      <button
        className="ig-float-trigger"
        style={{ '--ic': color }}
        onClick={abrirDrawer}
      >
        <span className="ig-float-trigger-text">
          <span className="ig-float-trigger-cat">Indicadores</span>
          <span className="ig-float-trigger-ind">{indicador || '…'}</span>
        </span>
        <span className="ig-float-trigger-dot" style={{ background: `${color}22` }}>
          {icono && (
            <img src={icono} alt="" className="ig-float-trigger-icon" />
          )}
        </span>
      </button>
    )}

    {drawerAbierto && (
      <div className="ig-drawer-backdrop" onClick={cerrarDrawer} />
    )}

    <aside className={`ig-drawer${drawerAbierto ? ' ig-drawer--open' : ''}`}>
      <div className="ig-drawer-header">
        <span className="ig-drawer-title">Indicadores</span>
        <button className="ig-drawer-close" onClick={cerrarDrawer}>
          <IconoCerrar tamano={13} strokeLinejoin="round" />
        </button>
      </div>

      <div className="ig-drawer-body">
        {grupos.map(({ cat, color: colorGrupo, icono: iconoGrupo, inds }) => {
          const esActiva = categoria === cat;
          return (
            <div key={cat} className="ig-ind-cat-group">
              <button
                className={`ig-ind-cat-btn${esActiva ? ' ig-ind-cat-btn--open' : ''}`}
                style={{ '--ic': colorGrupo }}
                onClick={() => seleccionar(esActiva ? indicador : inds[0])}
              >
                <span className="ig-ind-cat-nombre">
                  {/* El ícono de la familia (del catálogo del mapeo), en su color */}
                  <span className="ig-ind-cat-icono" style={{ background: `${colorGrupo}1f` }}>
                    {iconoGrupo && <img src={iconoGrupo} alt="" />}
                  </span>
                  {cat}
                </span>
                <span className="ig-ind-cat-right">
                  <span className="ig-ind-cat-badge">{inds.length}</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  </>
);

export default SelectorIndicadores;
