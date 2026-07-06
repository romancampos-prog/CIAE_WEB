import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './restricciones.css';

const ReporteRestricciones = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { restricciones, indicador } = location.state || {};
  const [abierto, setAbierto] = useState(null);

  if (!restricciones) {
    return (
      <div className="empty-state">
        <p>No hay datos disponibles.</p>
        <button onClick={() => navigate(-1)}>Regresar</button>
      </div>
    );
  }

  return (
    <div className="res-page-container animate-fade">
      <header className="res-nav-header">
        <button className="res-back-btn" onClick={() => navigate(-1)}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Panel de Configuración
        </button>
        <div className="res-header-content">
          <h1 className="res-main-title">Restricciones detectadas</h1>
          <span className="res-indicator-pill">{indicador}</span>
        </div>
      </header>

      <div className="res-accordion-stack">
        {Object.entries(restricciones).map(([key, error]) => (
          <div key={key} className={`res-card ${abierto === key ? 'is-active' : ''}`}>
            
            {/* HEADER MINIMALISTA */}
            <div className="res-card-header" onClick={() => setAbierto(abierto === key ? null : key)}>
              <div className="res-error-info">
                <svg className="res-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="res-error-name">{error.nombreError}</h2>
              </div>
              <span className="res-toggle-text">
                {abierto === key ? 'CERRAR' : 'VER DETALLES'}
              </span>
            </div>

            {/* CUERPO DESPLEGABLE */}
            {abierto === key && (
              <div className="res-card-body animate-slide-in">
                <p className="res-error-desc">{error.descripcionError}</p>
                
                <div className="res-units-grid">
                  {Object.entries(error.unidades).map(([nombreUnidad, bloques]) => (
                    <div key={nombreUnidad} className="res-unit-item">
                      <h3 className="res-unit-title">{nombreUnidad}</h3>
                      
                      {bloques.map((bloque, idx) => (
                        <div key={idx} className="res-path-block">
                          <div className="res-tags">
                            {bloque.reportes.map((rep, i) => (
                              <span key={i} className="res-tag">{rep}</span>
                            ))}
                          </div>
                          <div className="res-path-box">
                            <label>RUTA FTP</label>
                            <code>{bloque.ruta}</code>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReporteRestricciones;