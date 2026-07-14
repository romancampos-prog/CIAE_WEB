import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/contexto/AuthContext';
import { useRol } from '../../../auth/hooks/useRol';
import logo_imss from '../../../assets/logo_imms.png';
import { getIAASMesesGuardados } from '../api/IAAS';
import { MESES_LARGOS_ARR } from '../../shared/constantes/meses';
import './iass.css';

const IAASLanding = () => {
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const { puedeGenIAAS } = useRol();
  const anioActual = String(new Date().getFullYear());
  const [mesesGuardados, setMesesGuardados] = useState(null);

  useEffect(() => { document.title = 'IAAS | CIAE'; }, []);

  useEffect(() => {
    getIAASMesesGuardados(anioActual).then(setMesesGuardados);
  }, []);

  const ultimoMes = mesesGuardados?.length
    ? MESES_LARGOS_ARR[parseInt(mesesGuardados[mesesGuardados.length - 1]) - 1]
    : null;

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
            Indicadores
          </button>
        </div>
        <div className="ia-user-pill">
          <span className="ia-user-led" />
          {user?.user || 'Invitado'}
        </div>
      </header>

      <main className="ia-hub-main">
        <div className="ia-hub-hero">
          <p className="ia-hub-acronym">Infecciones Asociadas a la Atención de la Salud</p>
          <p className="ia-hub-sub">¿Qué deseas hacer?</p>
        </div>

        <div className="ia-hub-cards">

          {/* Ver datos */}
          <div
            className={`home-card${!mesesGuardados?.length ? ' home-card--disabled' : ''}`}
            onClick={() => { if (mesesGuardados?.length) navigate('/CIAE/IndicadoresMedicos/Graficas'); }}
          >
            <div className="hc-header hc-header--green">
              <div className="hc-icon-box hc-icon-box--green">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div className="hc-header-text">
                <p className="hc-eyebrow">Consulta</p>
                <h2 className="hc-name">Ver datos</h2>
              </div>
            </div>
            <p className="hc-desc">
              Gráfica de tendencia mensual por unidad e indicador, y descarga del reporte acumulado.
            </p>
            <div className="hc-footer">
              <div className="hc-chips">
                {mesesGuardados === null && (
                  <span className="hc-chip hc-chip--green">Verificando…</span>
                )}
                {mesesGuardados !== null && mesesGuardados.length === 0 && (
                  <span className="hc-chip hc-chip--muted">Sin datos en {anioActual}</span>
                )}
                {mesesGuardados !== null && mesesGuardados.length > 0 && (
                  <>
                    <span className="hc-chip hc-chip--green">Hasta {ultimoMes}</span>
                    <span className="hc-chip hc-chip--green">{mesesGuardados.length} mes{mesesGuardados.length !== 1 ? 'es' : ''}</span>
                  </>
                )}
              </div>
              <div className="hc-arrow hc-arrow--green">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Nuevo reporte */}
          {puedeGenIAAS && (
          <div className="home-card" onClick={() => navigate('/CIAE/IndicadoresMedicos/IAAS/Reporte')}>
            <div className="hc-header hc-header--gold">
              <div className="hc-icon-box hc-icon-box--gold">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div className="hc-header-text">
                <p className="hc-eyebrow">Captura</p>
                <h2 className="hc-name">Nuevo reporte</h2>
              </div>
            </div>
            <p className="hc-desc">
              Sube los archivos de cada unidad y captura los denominadores para generar los 6 indicadores.
            </p>
            <div className="hc-footer">
              <div className="hc-chips">
                <span className="hc-chip hc-chip--gold">IAAS 01–06</span>
              </div>
              <div className="hc-arrow hc-arrow--green">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </div>
          </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default IAASLanding;
