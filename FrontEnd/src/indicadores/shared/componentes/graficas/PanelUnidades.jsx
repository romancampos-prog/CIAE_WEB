import { useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Panel lateral de selección de unidades.
 * En mobile (ver media query en graficas.css) se comporta como un selector:
 * un chip muestra la unidad activa y, al tocarlo, la lista + buscador se
 * despliegan como una hoja inferior — en vez de una lista larga siempre
 * visible. Desktop no cambia (panel fijo de siempre).
 *
 * La hoja se renderiza con un Portal a document.body: el contenedor padre
 * (.ig-main) tiene una animación de entrada que deja un `transform` activo
 * al terminar, lo que lo convierte en el "containing block" de cualquier
 * `position: fixed` dentro de él — sin el portal, la hoja quedaría atrapada
 * dentro de .ig-main en vez de cubrir toda la pantalla (footer incluido).
 *
 * Props:
 *   unidades      — array { unidad, color }   — lista con su semáforo
 *   unidadSel     — string                    — unidad actualmente activa
 *   vistaGrafica  — string                    — 'unidad' | 'mes' | 'acumulado'
 *   indColor      — string                    — color del indicador activo
 *   busq          — string                    — texto del buscador
 *   onBusq        — fn(valor)                 — cambia el buscador
 *   onSelect      — fn(unidad)                — selecciona unidad (cambia a vista 'unidad')
 *   // Opcionales IAAS:
 *   hgsSet        — Set                       — unidades con clasificación HGS
 *   mostrarHgs    — bool                      — solo activo para IAAS 01
 *   HGS_COLOR     — string
 *   HGS_BG        — string
 */
const isTotalItem = (u) => u === 'TOTAL_OOAD' || u === 'TOTAL OOAD';

const PanelUnidades = ({
  unidades = [],
  unidadSel,
  vistaGrafica,
  indColor,
  busq,
  onBusq,
  onSelect,
  hgsSet,
  mostrarHgs = false,
  HGS_COLOR,
  HGS_BG,
}) => {
  const [abierto, setAbierto] = useState(false);

  const totalItem = unidades.find(({ unidad }) => isTotalItem(unidad));
  const sinTotal  = unidades.filter(({ unidad }) => !isTotalItem(unidad));
  const filtradas = sinTotal.filter(({ unidad }) =>
    unidad.toLowerCase().includes(busq.toLowerCase())
  );

  // En mobile cierra la hoja al elegir; en desktop no tiene efecto visual
  const seleccionar = (unidad) => {
    onSelect(unidad);
    setAbierto(false);
  };

  const renderItem = ({ unidad, color }) => {
    const activa = unidadSel === unidad && vistaGrafica !== 'mes';
    return (
      <button
        key={unidad}
        className={`ig-unit-item${activa ? ' ig-unit-item--active' : ''}`}
        style={activa ? { borderLeftColor: indColor } : {}}
        onClick={() => seleccionar(unidad)}
      >
        <span className="ig-unit-name">{unidad}</span>
        {mostrarHgs && hgsSet?.has(unidad) && (
          <span style={{
            fontSize: '0.52rem', fontWeight: 700,
            color: HGS_COLOR, background: HGS_BG,
            borderRadius: '3px', padding: '1px 4px', flexShrink: 0,
          }}>HGS</span>
        )}
        {color === 'Bajo' && (
          <span className="ig-unit-bajo-badge" title="Umbral bajo en último mes">!</span>
        )}
        {color === "Gris" && (
          <span className="ig-unit-gris-badge" title="Sin datos en último mes">?</span>
        )}
        {color === "Medio" && (
          <span className="ig-unit-medio-badge" title="Umbral medio en último mes">!</span>
        )}
      </button>
    );
  };

  const panelContent = (
    <>
      <div className="ig-unit-panel-topbar">
        <p className="ig-unit-list-title">Unidades</p>
        <button type="button" className="ig-unit-panel-close" onClick={() => setAbierto(false)} aria-label="Cerrar">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="ig-unit-search-wrap">
        <svg className="ig-unit-search-icon" width="11" height="11" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="ig-unit-search"
          placeholder="Buscar…"
          value={busq}
          onChange={e => onBusq(e.target.value)}
        />
        {busq && (
          <button className="ig-unit-search-clear" onClick={() => onBusq('')}>×</button>
        )}
      </div>

      <div className="ig-unit-list">
        {filtradas.map(renderItem)}

        {totalItem && (
          <>
            <div className="ig-unit-total-sep" />
            <button
              className={`ig-unit-item ig-unit-item--total${unidadSel === totalItem.unidad && vistaGrafica !== 'mes' ? ' ig-unit-item--active' : ''}`}
              style={unidadSel === totalItem.unidad && vistaGrafica !== 'mes' ? { borderLeftColor: indColor } : {}}
              onClick={() => seleccionar(totalItem.unidad)}
            >
              <span className="ig-unit-name">TOTAL OOAD</span>
              {totalItem.color === 'Bajo' && (
                <span className="ig-unit-bajo-badge" title="Umbral bajo en último mes">!</span>
              )}
              {totalItem.color === "Gris" && (
                <span className="ig-unit-gris-badge" title="Sin datos en último mes">?</span>
              )}
              {totalItem.color === "Medio" && (
                <span className="ig-unit-medio-badge" title="Umbral medio en último mes">!</span>
              )}
            </button>
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Chip selector — solo visible en mobile */}
      <button
        type="button"
        className="ig-unit-trigger"
        style={{ '--ic': indColor }}
        onClick={() => setAbierto(true)}
      >
        <span className="ig-unit-trigger-label">Unidad</span>
        <span className="ig-unit-trigger-value">{unidadSel || 'Selecciona…'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Panel en flujo normal — es el que se ve en desktop; en mobile
          queda oculto (el overlay real se porta al body, más abajo) */}
      <div className="ig-unit-panel ig-unit-panel--selector">
        {panelContent}
      </div>

      {/* Overlay mobile: portal a document.body para no quedar atrapado
          dentro de .ig-main y así cubrir toda la pantalla, footer incluido */}
      {abierto && createPortal(
        <>
          <div className="ig-unit-backdrop" onClick={() => setAbierto(false)} />
          <div className="ig-unit-panel ig-unit-panel--selector ig-unit-panel--open">
            {panelContent}
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default PanelUnidades;
