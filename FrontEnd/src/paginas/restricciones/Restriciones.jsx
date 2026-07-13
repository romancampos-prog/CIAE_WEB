import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './restricciones.css';

const SEVERIDAD = {
  RUTA_INVALIDA:          'critico',
  ARCHIVO_NO_ENCONTRADO:  'critico',
  HOJA_NO_ENCONTRADA:     'critico',
  ETIQUETA_NO_ENCONTRADA: 'critico',
  ARCHIVO_VACIO:          'critico',
  CALCULO_FALLIDO:        'critico',
  ARCHIVO_DUPLICADO:      'advertencia',
  VALOR_NULO:             'advertencia',
  DESCARGA_FALLIDA:       'advertencia',
  PB_JSON_ERROR:          'advertencia',
};

const LABEL_RUTA = {
  ETIQUETA_NO_ENCONTRADA: 'Detalle',
  CALCULO_FALLIDO:        'Detalle del error',
  PB_JSON_ERROR:          'Detalle del error',
  ARCHIVO_VACIO:          'Detalle',
  HOJA_NO_ENCONTRADA:     'Detalle',
  DESCARGA_FALLIDA:       'Detalle',
};

const IcoCritico = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

const IcoAdvertencia = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const ReporteRestricciones = () => {
  const { restricciones, indicador } = useLocation().state || {};
  const navigate  = useNavigate();
  const [abierto, setAbierto] = useState(() => {
    if (!restricciones) return null;
    const keys = Object.keys(restricciones);
    return keys.length === 1 ? keys[0] : null;
  });

  if (!restricciones) {
    return (
      <div className="res-empty">
        <p>No hay datos disponibles.</p>
        <button onClick={() => navigate('/CIAE/IndicadoresMedicos/Grafica/Config')}>Regresar</button>
      </div>
    );
  }

  const tiposCount    = Object.keys(restricciones).length;
  const totalUnidades = new Set(
    Object.values(restricciones).flatMap(e => Object.keys(e.unidades))
  ).size;
  const hayCriticos   = Object.keys(restricciones).some(k => SEVERIDAD[k] === 'critico');

  return (
    <div className="res-page">

      {/* ── Nav ── */}
      <header className="res-nav">
        <button className="res-back" onClick={() => navigate('/CIAE/IndicadoresMedicos/Grafica/Config')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Panel de Configuración
        </button>

        <div className="res-hero">
          <div className="res-hero-top">
            <h1 className="res-titulo">Restricciones detectadas</h1>
            {hayCriticos
              ? <span className="res-sev-pill res-sev-pill--critico">Crítico</span>
              : <span className="res-sev-pill res-sev-pill--advertencia">Advertencia</span>
            }
          </div>
          <div className="res-summary-row">
            {indicador && <span className="res-ind-pill">{indicador}</span>}
            <span className="res-stat">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              </svg>
              {tiposCount} tipo{tiposCount !== 1 ? 's' : ''} de restricción
            </span>
            <span className="res-sep">·</span>
            <span className="res-stat">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {totalUnidades} unidad{totalUnidades !== 1 ? 'es' : ''} afectada{totalUnidades !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </header>

      {/* ── Cards ── */}
      <div className="res-lista">
        {Object.entries(restricciones).map(([key, error]) => {
          const sev    = SEVERIDAD[key] || 'advertencia';
          const total  = Object.keys(error.unidades).length;
          const open   = abierto === key;
          const label  = LABEL_RUTA[key] || 'Ruta FTP';

          return (
            <div key={key} className={`res-card res-card--${sev}`}>

              {/* Header */}
              <button
                className="res-card-btn"
                onClick={() => setAbierto(open ? null : key)}
              >
                <div className="res-card-left">
                  <span className={`res-ico res-ico--${sev}`}>
                    {sev === 'critico' ? <IcoCritico /> : <IcoAdvertencia />}
                  </span>
                  <div className="res-card-texto">
                    <p className="res-nombre">{error.nombreError}</p>
                    <p className="res-desc">{error.descripcionError}</p>
                  </div>
                </div>
                <div className="res-card-right">
                  <span className={`res-badge res-badge--${sev}`}>
                    {total} unidad{total !== 1 ? 'es' : ''}
                  </span>
                  <svg
                    className={`res-chevron ${open ? 'res-chevron--open' : ''}`}
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </button>

              {/* Tabla desplegable */}
              {open && (
                <div className="res-body">
                  <div className="res-tabla-header">
                    <span>Unidad</span>
                    <span>Reporte</span>
                    <span>{label}</span>
                  </div>
                  <div className="res-tabla">
                    {Object.entries(error.unidades).map(([unidad, bloques]) =>
                      bloques.map((bloque, i) => (
                        <div key={`${unidad}-${i}`} className="res-fila">
                          <span className="res-fila-unidad" title={unidad}>
                            {unidad}
                          </span>
                          <div className="res-fila-repos">
                            {bloque.reportes.map((r, j) => (
                              <span key={j} className="res-chip">{r}</span>
                            ))}
                          </div>
                          <div className="res-fila-ruta">
                            <code
                              className={`res-ruta ${sev === 'critico' && LABEL_RUTA[key] ? 'res-ruta--error' : ''}`}
                              title={bloque.ruta}
                            >
                              {bloque.ruta}
                            </code>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default ReporteRestricciones;
