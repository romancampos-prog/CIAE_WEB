import { useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Estructura compartida de un selector lateral de gráficas: en desktop es un
 * panel fijo siempre visible; en mobile (ver media query en graficas.css) se
 * reduce a un chip con el valor activo que, al tocarlo, despliega la lista
 * como una hoja inferior. Usado por PanelUnidades (lista de unidades) y por
 * el selector de mes de FTP/IAAS -- mismo comportamiento para cualquier
 * panel lateral, no solo para unidades.
 *
 * La hoja se renderiza con un Portal a document.body -- ver PanelUnidades
 * para el porqué (el contenedor padre queda con un `transform` activo que
 * lo vuelve el "containing block" de cualquier `position: fixed` dentro).
 *
 * Props:
 *   triggerLabel — string     — etiqueta del chip (ej. "Unidad", "Mes")
 *   triggerValue — string     — valor activo mostrado en el chip
 *   panelTitle   — string     — título dentro del panel/hoja (ej. "Unidades", "Mes")
 *   indColor     — string     — color de acento del valor activo
 *   extraClass   — string     — clase extra para el panel en flujo (ej. "ig-unit-panel--mes")
 *   children     — fn(cerrar) — contenido de la lista; recibe cerrar() para
 *                               cerrar la hoja al elegir un ítem (sin efecto en desktop)
 */
const PanelSelector = ({ triggerLabel, triggerValue, panelTitle, indColor, extraClass = '', children }) => {
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);

  const panelContent = (
    <>
      <div className="ig-unit-panel-topbar">
        <p className="ig-unit-list-title">{panelTitle}</p>
        <button type="button" className="ig-unit-panel-close" onClick={cerrar} aria-label="Cerrar">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      {children(cerrar)}
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
        <span className="ig-unit-trigger-label">{triggerLabel}</span>
        <span className="ig-unit-trigger-value">{triggerValue || 'Selecciona…'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Panel en flujo normal — es el que se ve en desktop; en mobile
          queda oculto (el overlay real se porta al body, más abajo) */}
      <div className={`ig-unit-panel ig-unit-panel--selector ${extraClass}`.trim()}>
        {panelContent}
      </div>

      {/* Overlay mobile: portal a document.body para no quedar atrapado
          dentro de .ig-main y así cubrir toda la pantalla, footer incluido */}
      {abierto && createPortal(
        <>
          <div className="ig-unit-backdrop" onClick={cerrar} />
          <div className={`ig-unit-panel ig-unit-panel--selector ig-unit-panel--open ${extraClass}`.trim()}>
            {panelContent}
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default PanelSelector;
