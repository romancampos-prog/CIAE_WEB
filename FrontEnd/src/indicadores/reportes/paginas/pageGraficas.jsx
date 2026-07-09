import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import GBarras from '@ftp/componentes/graficasFTP/GBarras';
import FilterPanel from '@ftp/componentes/graficasFTP/FilterPanel';
import logo_imss from '../../../assets/logo_imms.png';
import './pageGrafica.css';
import InformacionIndicador from '../componentes/InformacionIndicador/InformacionIndicador';
import { getIndicador } from '@ftp/api/indicadores';

export default function PageGrafica() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { Indicador, semaforo, fecha, datosMapa, retornoSeguro } = location.state || {};

  const [datosFiltrados, setDatosFiltrados] = useState(datosMapa || {});
  const [panelAbierto,   setPanelAbierto]   = useState(false);
  const [filtroActivo,   setFiltroActivo]   = useState(false);
  const [verDetalle,     setVerDetalle]     = useState(false);
  const [infoIndicador,  setInfoIndicador]  = useState(null);

  useEffect(() => {
    if (datosMapa) setDatosFiltrados(datosMapa);
  }, [datosMapa]);

  useEffect(() => {
    document.title = `Gráficas | ${Indicador || 'CIAE'}`;
    if (!Indicador) { navigate('/CIAE/IndicadoresMedicos'); return; }
    getIndicador(Indicador).then(res => setInfoIndicador(res.data)).catch(console.error);
  }, [Indicador, navigate]);

  const handleFilterChange = useCallback((nuevosDatos) => {
    setDatosFiltrados(nuevosDatos);
    setFiltroActivo(Object.keys(nuevosDatos).length < Object.keys(datosMapa || {}).length);
    setPanelAbierto(false);
  }, [datosMapa]);

  const limpiarFiltro = () => { setDatosFiltrados(datosMapa); setFiltroActivo(false); };

  if (!Indicador || !datosMapa) return (
    <div className="pg-loading">
      <div className="pg-loading-spin" />
      Cargando datos…
    </div>
  );

  const totalUnidades    = Object.keys(datosMapa).length;
  const unidadesMostrando = Object.keys(datosFiltrados).length;
  const esDescendente    = semaforo?.Alto !== undefined;

  const handleVolver = () => {
    if (retornoSeguro) navigate('/CIAE/IndicadoresMedicos/Config', { state: { indicador: Indicador, retornoSeguro } });
    else navigate(-1);
  };

  return (
    <div className="pg-root">

      {/* Fondo */}
      <div className="pg-bg" aria-hidden="true">
        <div className="pg-blob pg-blob-1" />
        <div className="pg-blob pg-blob-2" />
        <div className="pg-grid-overlay" />
      </div>

      {/* Nav */}
      <nav className="pg-navbar">
        <div className="pg-navbar-left">
          <img src={logo_imss} alt="IMSS" className="pg-logo" />
          <div className="pg-nav-divider" />
          <button className="pg-btn-back" onClick={handleVolver}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Volver
          </button>
        </div>

        <div className="pg-navbar-center">
          <span className="pg-nav-badge">Resultados</span>
          <h1 className="pg-nav-title">{Indicador}</h1>
        </div>

        <div className="pg-navbar-right">
          <div className="pg-fecha-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {fecha}
          </div>
          <button className="pg-ficha-btn-nav" onClick={() => setVerDetalle(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Ficha técnica
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className="pg-main">

        {/* Strip semáforo + filtro */}
        <section className="pg-semaforo-strip">
          <span className="pg-sem-heading">Rangos de desempeño</span>

          <div className="pg-semaforo-items">
            <div className="pg-sem-item pg-sem-verde">
              <span className="pg-sem-dot" />
              <div>
                <small>Esperado</small>
                <strong>{esDescendente ? `≤ ${semaforo?.Esperado}%` : `≥ ${semaforo?.Esperado}%`}</strong>
              </div>
            </div>
            <div className="pg-sem-sep" />
            <div className="pg-sem-item pg-sem-amarillo">
              <span className="pg-sem-dot" />
              <div>
                <small>Medio</small>
                <strong>
                  {esDescendente
                    ? `> ${semaforo?.Esperado}% — < ${semaforo?.Alto}%`
                    : `> ${semaforo?.Bajo}% — < ${semaforo?.Esperado}%`}
                </strong>
              </div>
            </div>
            <div className="pg-sem-sep" />
            <div className="pg-sem-item pg-sem-rojo">
              <span className="pg-sem-dot" />
              <div>
                <small>{esDescendente ? 'Alto' : 'Bajo'}</small>
                <strong>{esDescendente ? `≥ ${semaforo?.Alto}%` : `≤ ${semaforo?.Bajo}%`}</strong>
              </div>
            </div>
          </div>

          <div className="pg-filter-controls">
            {filtroActivo && (
              <div className="pg-chip-filtro">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                {unidadesMostrando} / {totalUnidades}
                <button onClick={limpiarFiltro} className="pg-chip-clear">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}
            <button
              className={`pg-btn-filtro ${panelAbierto ? 'pg-btn-filtro--active' : ''}`}
              onClick={() => setPanelAbierto(!panelAbierto)}
            >
              {panelAbierto ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Cerrar
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                  </svg>
                  Filtrar unidades
                </>
              )}
            </button>
          </div>
        </section>

        {/* Panel de filtros */}
        {panelAbierto && (
          <div className="pg-filter-panel-wrapper">
            <FilterPanel datos={datosMapa} onFilterChange={handleFilterChange} />
          </div>
        )}

        {/* Tarjeta gráfica */}
        <div className="pg-chart-card">
          <div className="pg-chart-header">
            <div className="pg-chart-title-group">
              <div className="pg-chart-icon-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18M9 21V9"/>
                </svg>
              </div>
              <div>
                <p className="pg-chart-subtitle">Distribución por unidad médica</p>
                <p className="pg-chart-count">
                  Mostrando <strong>{unidadesMostrando}</strong> de <strong>{totalUnidades}</strong> unidades
                </p>
              </div>
            </div>
            {unidadesMostrando > 6 && (
              <span className="pg-chart-scroll-hint">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                Desliza horizontalmente
              </span>
            )}
          </div>

          <div className="pg-chart-scroll-area">
            <div
              className="pg-canvas-wrapper"
              style={{ minWidth: Math.max(900, unidadesMostrando * 50) + 'px' }}
            >
              <GBarras datos={datosFiltrados} config={semaforo} />
            </div>
          </div>
        </div>

      </main>

      {/* Panel lateral ficha técnica */}
      {verDetalle && (
        <div className="side-panel-overlay" onClick={() => setVerDetalle(false)}>
          <div className="side-panel-content" onClick={e => e.stopPropagation()}>
            <header className="panel-header">
              <h2>Ficha Técnica — {Indicador}</h2>
              <button className="close-panel" onClick={() => setVerDetalle(false)}>✕</button>
            </header>
            <div className="panel-scroll-area">
              <InformacionIndicador data={infoIndicador} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
