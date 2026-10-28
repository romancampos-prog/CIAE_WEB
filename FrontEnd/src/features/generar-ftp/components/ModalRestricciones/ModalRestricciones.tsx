// react
import { useState } from 'react';
// propios
import type { Restricciones } from '@/types/api/indicadores/ftp';
import { IconoAlerta, IconoCerrar, IconoChevronAbajo, IconoError } from '@/components/icons';
import './restricciones.css';
import './modalRestricciones.css';

type Severidad = 'critico' | 'advertencia';

const SEVERIDAD: Record<string, Severidad> = {
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
  SERVICIO_NO_APLICA:     'advertencia',
};

const LABEL_RUTA: Record<string, string> = {
  ETIQUETA_NO_ENCONTRADA: 'Detalle',
  CALCULO_FALLIDO:        'Detalle del error',
  PB_JSON_ERROR:          'Detalle del error',
  ARCHIVO_VACIO:          'Detalle',
  HOJA_NO_ENCONTRADA:     'Detalle',
  DESCARGA_FALLIDA:       'Detalle',
  SERVICIO_NO_APLICA:     'Detalle',
};

// Separa "{ruta}  ✗ fallo en: '{segmento}' — {diagnostico}" en sus 3 partes
// para poder darles su propia línea/estilo en vez de un solo párrafo pegado.
// Si el texto no trae ese formato (otros tipos de error), regresa null y se
// muestra el texto tal cual, sin partir nada.
const partirRutaError = (texto: string | null | undefined) => {
  const m = /^(.*?)\s*✗\s*fallo en:\s*'([^']*)'\s*—\s*(.*)$/s.exec(texto ?? '');
  if (!m) return null;
  const [, ruta, segmento, diagnostico] = m;
  return { ruta: ruta.trim(), segmento, diagnostico };
};

interface Props {
  isOpen: boolean;
  restricciones: Restricciones | null;
  indicador?: string;
  /** Texto del pie; epidemiología (Acciones) pone el suyo. */
  nota?: string;
  onClose: () => void;
}

const ModalRestricciones = ({
  isOpen, restricciones, indicador, onClose,
  nota = 'Los indicadores sin restricciones se generaron y descargaron correctamente.',
}: Props) => {
  const entries = Object.entries(restricciones ?? {});

  const [abierto, setAbierto] = useState(() =>
    entries.length === 1 ? entries[0][0] : null
  );

  if (!isOpen || !entries.length) return null;

  const tiposCount    = entries.length;
  const totalUnidades = new Set(
    entries.flatMap(([, e]) => Object.keys(e.unidades ?? {}))
  ).size;
  const hayCriticos   = entries.some(([k]) => SEVERIDAD[k] === 'critico');
  const sev           = hayCriticos ? 'critico' : 'advertencia';

  return (
    <div className="modal-overlay mrest-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`mrest-modal-box mrest-modal-box--${sev}`}>

        {/* ── Cabecera ── */}
        <div className="mrest-modal-header">
          <div className="mrest-modal-header-main">

            {/* Icono + título */}
            <div className="mrest-header-icon-wrap">
              <span className={`mrest-header-icon mrest-header-icon--${sev}`}>
                {hayCriticos ? <IconoError /> : <IconoAlerta tamano={18} />}
              </span>
            </div>
            <div className="mrest-header-text">
              <div className="mrest-title-row">
                <h3 className="mrest-modal-title">Restricciones detectadas</h3>
                <span className={`res-sev-pill res-sev-pill--${sev}`}>
                  {hayCriticos ? 'Crítico' : 'Advertencia'}
                </span>
              </div>
              {indicador && (
                <span className="res-ind-pill" style={{ display: 'inline-block', marginTop: 4 }}>
                  {indicador}
                </span>
              )}
            </div>

          </div>

          {/* Stat-cards + cerrar */}
          <div className="mrest-header-right">
            <div className="mrest-stat-cards">
              <div className={`mrest-stat-card mrest-stat-card--${sev}`}>
                <span className="mrest-stat-num">{tiposCount}</span>
                <span className="mrest-stat-label">tipo{tiposCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="mrest-stat-card mrest-stat-card--neutral">
                <span className="mrest-stat-num">{totalUnidades}</span>
                <span className="mrest-stat-label">unidad{totalUnidades !== 1 ? 'es' : ''}</span>
              </div>
            </div>
            <button className="mrest-modal-close" onClick={onClose} title="Cerrar">
              <IconoCerrar tamano={14} strokeLinejoin="round" />
            </button>
          </div>
        </div>

        {/* ── Cards scrollables ── */}
        <div className="mrest-modal-body">
          <div className="res-lista" style={{ maxWidth: '100%', margin: 0, padding: '4px 0 2px' }}>
            {entries.map(([key, error]) => {
              const cardSev = SEVERIDAD[key] || 'advertencia';
              const total   = Object.keys(error.unidades ?? {}).length;
              const open    = abierto === key;
              const label   = LABEL_RUTA[key] || 'Ruta FTP';

              return (
                <div key={key} className={`res-card res-card--${cardSev}`}>
                  <button
                    className="res-card-btn"
                    onClick={() => setAbierto(open ? null : key)}
                  >
                    <div className="res-card-left">
                      <span className={`res-ico res-ico--${cardSev}`}>
                        {cardSev === 'critico' ? <IconoError /> : <IconoAlerta tamano={18} />}
                      </span>
                      <div className="res-card-texto">
                        <p className="res-nombre">{error.nombreError}</p>
                        <p className="res-desc">{error.descripcionError}</p>
                      </div>
                    </div>
                    <div className="res-card-right">
                      <span className={`res-badge res-badge--${cardSev}`}>
                        {total} unidad{total !== 1 ? 'es' : ''}
                      </span>
                      <IconoChevronAbajo className={`res-chevron ${open ? 'res-chevron--open' : ''}`} />
                    </div>
                  </button>

                  {open && (
                    <div className="res-body">
                      <div className="res-tabla-header">
                        <span>Unidad</span>
                        <span>Reporte</span>
                        <span>{label}</span>
                      </div>
                      <div className="res-tabla">
                        {Object.entries(error.unidades ?? {}).map(([unidad, bloques]) =>
                          (bloques ?? []).map((bloque, i) => (
                            <div key={`${unidad}-${i}`} className="res-fila">
                              <span className="res-fila-unidad" title={unidad}>{unidad}</span>
                              <div className="res-fila-repos">
                                {(bloque.reportes ?? []).map((r, j) => (
                                  <span key={j} className="res-chip">{r}</span>
                                ))}
                              </div>
                              <div className="res-fila-ruta">
                                {(() => {
                                  const partes = partirRutaError(bloque.ruta);
                                  if (!partes) {
                                    return (
                                      <code
                                        className={`res-ruta ${cardSev === 'critico' && LABEL_RUTA[key] ? 'res-ruta--error' : ''}`}
                                        title={bloque.ruta}
                                      >
                                        {bloque.ruta}
                                      </code>
                                    );
                                  }
                                  return (
                                    <div className="res-ruta-partes" title={bloque.ruta}>
                                      <code className="res-ruta-camino">{partes.ruta}</code>
                                      <div className="res-ruta-fallo">
                                        <span className="res-ruta-fallo-ico">✗</span>
                                        <span>falló en <code>'{partes.segmento}'</code></span>
                                      </div>
                                      <p className="res-ruta-diag">{partes.diagnostico}</p>
                                    </div>
                                  );
                                })()}
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

        {/* ── Pie ── */}
        <div className="mrest-modal-footer">
          <p className="mrest-modal-note">{nota}</p>
          <button className="mrest-btn-ok" onClick={onClose}>Entendido</button>
        </div>

      </div>
    </div>
  );
};

export default ModalRestricciones;
