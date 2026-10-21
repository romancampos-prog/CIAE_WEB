import { useState, useEffect, useMemo } from 'react';
import TopBar from '../../../shared/componentes/TopBar';
import { useRol } from '../../../auth/hooks/useRol';
import { obtenerTodosLosIndicadores, limpiarGraficasConsultadas } from '../../shared/api/indicadoresInfo';
import { urlIcono } from '../../shared/utils/iconos';
import GraficaIndicador from '../../shared/componentes/graficas/GraficaIndicador';
import './ftp.css';
import '../../shared/estilos/graficas.css';


const MenuIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6"  x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="15" y2="18"/>
  </svg>
);

const GraficasUnificadasPage = () => {
  const { esVisitante } = useRol();
  const [indSel, setIndSel]       = useState('');
  const [drawerOpen, setDrawer]   = useState(false);
  const [todosLosIndicadores, setTodosLosIndicadores] = useState([]);

  // Lo consultado solo vale mientras se está en gráficas: al entrar y al salir se olvida.
  useEffect(() => {
    limpiarGraficasConsultadas();
    return limpiarGraficasConsultadas;
  }, []);

  useEffect(() => {
    document.title = 'Gráficas | CIAE';
    obtenerTodosLosIndicadores()
      .then(lista => {
        const arr = lista ?? [];
        setTodosLosIndicadores(arr);
        const primero = arr[0]?.indicadores?.[0];
        if (primero) setIndSel(prev => prev || primero);
      })
      .catch(() => {});
  }, []);

  // El indice ya viene unificado del backend (ftp e IAAS por igual, con su
  // propio color) -- no hay que separar IAAS a mano ni duplicar su catalogo.
  const todosGrupos = useMemo(() => todosLosIndicadores.map(({ categoriaIndicador, indicadores, color, imagen }) => ({
    cat: categoriaIndicador, color: color || '#0b5445', icono: urlIcono(imagen), inds: indicadores ?? [],
  })), [todosLosIndicadores]);

  const indColor = useMemo(() => {
    for (const { inds, color } of todosGrupos) {
      if (inds.includes(indSel)) return color;
    }
    return '#0b5445';
  }, [indSel, todosGrupos]);

  const indCat = useMemo(() => {
    for (const { cat, inds } of todosGrupos) {
      if (inds.includes(indSel)) return cat;
    }
    return null;
  }, [indSel, todosGrupos]);

  const indIcono = useMemo(() => todosGrupos.find(({ cat }) => cat === indCat)?.icono ?? null, [indCat, todosGrupos]);

  const indsHermanos = useMemo(() => {
    const grupo = todosGrupos.find(({cat}) => cat === indCat);
    return grupo?.inds ?? [];
  }, [indCat, todosGrupos]);

  const seleccionar = (ind) => {
    setIndSel(ind);
    setDrawer(false);
  };

  return (
    <div className="ia-root">
      <div className="ia-bg" aria-hidden>
        <div className="ia-orb ia-orb-1" />
        <div className="ia-orb ia-orb-2" />
        <div className="ia-orb ia-orb-3" />
        <div className="ciae-grid" />
      </div>

      <TopBar backTo="/CIAE/IndicadoresMedicos" />

      {/* ── Botón flotante para abrir drawer ── */}
      {!drawerOpen && (
        <button
          className="ig-float-trigger"
          style={{ '--ic': indColor }}
          onClick={() => setDrawer(true)}
        >
          <span className="ig-float-trigger-text">
            <span className="ig-float-trigger-cat">Indicadores</span>
            <span className="ig-float-trigger-ind">{indSel || '…'}</span>
          </span>
          <span className="ig-float-trigger-dot" style={{ background: `${indColor}22` }}>
            {indIcono && (
              <img src={indIcono} alt="" className="ig-float-trigger-icon" />
            )}
          </span>
        </button>
      )}

      {/* Backdrop */}
      {drawerOpen && (
        <div className="ig-drawer-backdrop" onClick={() => setDrawer(false)} />
      )}

      {/* Drawer lateral */}
      <aside className={`ig-drawer${drawerOpen ? ' ig-drawer--open' : ''}`}>
        <div className="ig-drawer-header">
          <span className="ig-drawer-title">Indicadores</span>
          <button className="ig-drawer-close" onClick={() => setDrawer(false)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="ig-drawer-body">
          {todosGrupos.map(({ cat, color, inds }) => {
            const esActiva = indCat === cat;
            return (
              <div key={cat} className="ig-ind-cat-group">
                <button
                  className={`ig-ind-cat-btn${esActiva ? ' ig-ind-cat-btn--open' : ''}`}
                  style={{ '--ic': color }}
                  onClick={() => seleccionar(esActiva ? indSel : inds[0])}
                >
                  <span>{cat}</span>
                  <span className="ig-ind-cat-right">
                    <span className="ig-ind-cat-badge">{inds.length}</span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {/* El mismo contenido para FTP, IAAS y Extractor: el backend dice cómo es cada indicador. No renderiza hasta tener indicador. */}
      {indSel && <GraficaIndicador indSel={indSel} onIndSelChange={setIndSel} iconSrc={indIcono} indsHermanos={indsHermanos} colorFamilia={indColor} />}
    </div>
  );
};

export default GraficasUnificadasPage;
