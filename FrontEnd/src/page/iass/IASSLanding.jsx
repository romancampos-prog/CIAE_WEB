import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo_imss from '../../assets/logo_imms.png';
import { getIASSMesesGuardados } from '../../api/IASS';
import './IASS.css';

const NOMBRES_MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return { saludo: 'Buenos días',   icono: 'day' };
  if (h >= 12 && h < 19) return { saludo: 'Buenas tardes', icono: 'afternoon' };
  return                         { saludo: 'Buenas noches', icono: 'night' };
};

const IconDay = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IconAfternoon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 12h.01M12 2a10 10 0 0 1 0 20"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/>
    <circle cx="12" cy="12" r="4"/>
  </svg>
);
const IconNight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const IASSLanding = () => {
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const anioActual = String(new Date().getFullYear());
  const [mesesGuardados, setMesesGuardados] = useState(null);

  useEffect(() => { document.title = 'IASS | CIAE'; }, []);

  useEffect(() => {
    getIASSMesesGuardados(anioActual).then(setMesesGuardados);
  }, []);

  const ultimoMes = mesesGuardados?.length
    ? NOMBRES_MESES[parseInt(mesesGuardados[mesesGuardados.length - 1]) - 1]
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
            onClick={() => { if (mesesGuardados?.length) navigate('/CIAE/IndicadoresMedicos/IASS/Datos'); }}
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
          <div className="home-card" onClick={() => navigate('/CIAE/IndicadoresMedicos/IASS/Reporte')}>
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
                <span className="hc-chip hc-chip--gold">IASS 01–06</span>
              </div>
              <div className="hc-arrow hc-arrow--green">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default IASSLanding;
