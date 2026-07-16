/**
 * Panel lateral de selección de unidades.
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
const isTotalItem = (u) => u === 'TOTAL' || u === 'TOTAL OOAD';

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
  const totalItem = unidades.find(({ unidad }) => isTotalItem(unidad));
  const sinTotal  = unidades.filter(({ unidad }) => !isTotalItem(unidad));
  const filtradas = sinTotal.filter(({ unidad }) =>
    unidad.toLowerCase().includes(busq.toLowerCase())
  );

  const renderItem = ({ unidad, color }) => {
    const activa = unidadSel === unidad && vistaGrafica !== 'mes';
    return (
      <button
        key={unidad}
        className={`ig-unit-item${activa ? ' ig-unit-item--active' : ''}`}
        style={activa ? { borderLeftColor: indColor } : {}}
        onClick={() => onSelect(unidad)}
      >
        <span className="ig-unit-name">{unidad}</span>
        {mostrarHgs && hgsSet?.has(unidad) && (
          <span style={{
            fontSize: '0.52rem', fontWeight: 700,
            color: HGS_COLOR, background: HGS_BG,
            borderRadius: '3px', padding: '1px 4px', flexShrink: 0,
          }}>HGS</span>
        )}
        {color === 'Rojo' && (
          <span className="ig-unit-rojo-badge" title="Umbral rojo en último mes">!</span>
        )}
        {color === "Gris" && (
          <span className="ig-unit-gris-badge" title="Sin datos en último mes">?</span>
        )}
        {color === "Amarillo" && (
          <span className="ig-unit-amarillo-badge" title="Umbral amarillo en último mes">!</span>
        )}
      </button>
    );
  };

  return (
    <div className="ig-unit-panel">
      <p className="ig-unit-list-title">Unidades</p>
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
              onClick={() => onSelect(totalItem.unidad)}
            >
              <span className="ig-unit-name">TOTAL OOAD</span>
              {totalItem.color === 'Rojo' && (
                <span className="ig-unit-rojo-badge" title="Umbral rojo en último mes">!</span>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PanelUnidades;
