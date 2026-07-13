import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import logo_imss from '../../../assets/logo_imms.png';
import { useAuth } from '../../../auth/contexto/AuthContext';
import { getAllIndicadores } from '../api/indicadores';
import { CAT_COLOR } from '../constantes/colores';
import { INDICADORES as IASS_INDS } from '../../iaas/constantes/colores';
import FTPGraficasContenido from '../componentes/graficasFTP/FTPGraficasContenido';
import IASSGraficasContenido from '../../iaas/componentes/IASSGraficasContenido';
import './ftp.css';
import '../../shared/estilos/graficas.css';

import iconoCama  from '../../../assets/icono_cama.png';
import iconoCacu  from '../../../assets/icono_cacu.png';
import iconoEh    from '../../../assets/icono_eh.png';
import iconoDm    from '../../../assets/icono_dm.png';
import iconoMt    from '../../../assets/icono_mt.png';
import iconoCupn  from '../../../assets/icono_cupn.png';
import iconoSOb   from '../../../assets/icono_S_Ob.png';
import iconoCe    from '../../../assets/icono_ce (2).png';
import iconoIaas  from '../../../assets/icono_iaas.png';

const CAT_ICON = {
  CAMA: iconoCama, CACU: iconoCacu, EH: iconoEh,  DM: iconoDm,
  MT:   iconoMt,  CUPN: iconoCupn, S_Ob: iconoSOb, CE: iconoCe,
  IAAS: iconoIaas,
};

const IASS_COLOR = '#1a5276';

const MenuIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6"  x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="15" y2="18"/>
  </svg>
);

const GraficasUnificadasPage = () => {
  const navigate                  = useNavigate();
  const { user }                  = useAuth();
  const [indSel, setIndSel]       = useState('');
  const [drawerOpen, setDrawer]   = useState(false);
  const [catAbierta, setCatAb]    = useState(null);
  const [ftpLista, setFtpLista]   = useState({});

  const modulo = indSel.startsWith('IAAS') ? 'iass' : 'ftp';

  useEffect(() => {
    document.title = 'Gráficas | CIAE';
    getAllIndicadores()
      .then(res => {
        const lista = res?.data ?? {};
        setFtpLista(lista);
        const primero = Object.values(lista)[0]?.indicadores?.[0];
        if (primero) setIndSel(prev => prev || primero);
      })
      .catch(() => {});
  }, []);

  const todosGrupos = useMemo(() => [
    ...Object.entries(ftpLista).map(([cat, data]) => ({
      cat, color: CAT_COLOR[cat] ?? '#0b5445', inds: data.indicadores ?? [],
    })),
    { cat: 'IAAS', color: IASS_COLOR, inds: IASS_INDS },
  ], [ftpLista]);

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

  // Auto-abrir la categoría del indicador activo
  useEffect(() => {
    for (const { cat, inds } of todosGrupos) {
      if (inds.includes(indSel)) { setCatAb(cat); break; }
    }
  }, [indSel, todosGrupos]);

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

      <header className="ia-nav">
        <div className="ia-nav-left">
          <img src={logo_imss} alt="IMSS" className="ia-logo" />
          <div className="ia-nav-sep" />
          <button className="ia-btn-back" onClick={() => navigate('/CIAE/IndicadoresMedicos')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Indicadores Médicos
          </button>

        </div>
        <div className="ia-user-pill">
          <span className="ia-user-led" />
          {user?.user || 'Invitado'}
        </div>
      </header>

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
            {CAT_ICON[indCat] && (
              <img src={CAT_ICON[indCat]} alt="" className="ig-float-trigger-icon" />
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
            const abierta = catAbierta === cat;
            return (
              <div key={cat} className="ig-ind-cat-group">
                <button
                  className={`ig-ind-cat-btn${abierta ? ' ig-ind-cat-btn--open' : ''}`}
                  style={{ '--ic': color }}
                  onClick={() => setCatAb(abierta ? null : cat)}
                >
                  <span>{cat}</span>
                  <span className="ig-ind-cat-right">
                    <span className="ig-ind-cat-badge">{inds.length}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: abierta ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', opacity: 0.45 }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </span>
                </button>
                {abierta && (
                  <div className="ig-ind-cat-items" style={{ '--ic': color }}>
                    {inds.map(ind => (
                      <button
                        key={ind}
                        className={`ig-ind-item${indSel === ind ? ' ig-ind-item--active' : ''}`}
                        style={{ '--ic': color }}
                        onClick={() => seleccionar(ind)}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Contenido según módulo */}
      {modulo === 'ftp'  && <FTPGraficasContenido  indSel={indSel} onIndSelChange={setIndSel} iconSrc={CAT_ICON[indCat]} />}
      {modulo === 'iass' && <IASSGraficasContenido indSel={indSel} onIndSelChange={setIndSel} iconSrc={CAT_ICON[indCat]} />}
    </div>
  );
};

export default GraficasUnificadasPage;
