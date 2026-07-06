import { useState } from 'react';
import './metodos.css';

// ─── Configuración de modos ───────────────────────────────────────────────────
const MODOS = [
  {
    id:     'INTERSECCION',
    icon:   '🔍',
    label:  'Buscar por texto',
    cuando: 'Hay una palabra única en la hoja (ej. "TOTAL DE LA UNIDAD") que identifica exactamente la fila. El sistema la encuentra y lee las columnas que le indiques.',
  },
  {
    id:     'FINAL',
    icon:   '⬇️',
    label:  'Al final de la tabla',
    cuando: 'La misma palabra se repite en varias filas — no es única, así que no se puede buscar por texto. Se toma el último bloque de la tabla automáticamente.',
  },
  {
    id:     'INTERSECCION_FILA',
    icon:   '↔️',
    label:  'Por número de fila',
    cuando: 'No necesitas buscar por texto. Solo requieres valores de filas específicas (por su número) dentro de una columna determinada.',
  },
];

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ModoSelector({ value, onChange }) {
  const [infoAbierta, setInfoAbierta] = useState(null);

  const toggleInfo = (e, modoId) => {
    e.stopPropagation();
    setInfoAbierta(prev => prev === modoId ? null : modoId);
  };

  return (
    <div className="ms-wrap">
      {MODOS.map(modo => {
        const activo   = value === modo.id;
        const infoOpen = infoAbierta === modo.id;

        return (
          <div key={modo.id} className={`ms-card ${activo ? 'ms-card--activo' : ''}`}>

            {/* Fila principal */}
            <div className="ms-card-top" onClick={() => { onChange(modo.id); setInfoAbierta(null); }}>
              <span className="ms-card-icon">{modo.icon}</span>
              <span className="ms-card-label">{modo.label}</span>
              <button
                className={`ms-info-btn ${infoOpen ? 'ms-info-btn--open' : ''}`}
                onClick={(e) => toggleInfo(e, modo.id)}
                title="Ver cuándo usar este modo"
              >
                ?
              </button>
            </div>

            {/* Panel desplegable */}
            {infoOpen && (
              <div className="ms-info-panel" onClick={e => e.stopPropagation()}>
                <ExcelDiagram modoId={modo.id} />
                <p className="ms-info-texto">{modo.cuando}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Diagramas ────────────────────────────────────────────────────────────────
function ExcelDiagram({ modoId }) {
  if (modoId === 'INTERSECCION')      return <DiagramaInterseccion />;
  if (modoId === 'FINAL')             return <DiagramaFinal />;
  if (modoId === 'INTERSECCION_FILA') return <DiagramaFila />;
  return null;
}

function DiagramaInterseccion() {
  const filas = [
    { etiqueta: 'Zona Norte',      b: '432', c: '118', resaltar: false },
    { etiqueta: 'Zona Sur',        b: '267', c: '74',  resaltar: false },
    { etiqueta: 'TOTAL DE UNIDAD', b: '890', c: '230', resaltar: true  },
  ];
  return (
    <div className="ms-diagrama">
      <span className="ms-diagrama-titulo">Así luce en el Excel</span>
      <div className="ms-excel-wrap">
        <div className="ms-excel-row ms-excel-header">
          <div className="ms-excel-cell ms-excel-cell--lbl" />
          {['B', 'C'].map(c => <div key={c} className="ms-excel-cell ms-excel-cell--col ms-col-dato">{c}</div>)}
        </div>
        {filas.map((f, i) => (
          <div key={i} className={`ms-excel-row ${f.resaltar ? 'ms-row--hit' : ''}`}>
            <div className="ms-excel-cell ms-excel-cell--lbl">
              {f.resaltar && <span className="ms-arrow">▶</span>}
              {f.etiqueta}
            </div>
            {[f.b, f.c].map((v, j) => (
              <div key={j} className={`ms-excel-cell ms-excel-cell--val ${f.resaltar ? 'ms-val--hit' : ''}`}>{v}</div>
            ))}
          </div>
        ))}
        <div className="ms-diagrama-leyenda">
          <span className="ms-leyenda-hit">■</span> Fila encontrada por texto único
          <span className="ms-leyenda-sep" />
          <span className="ms-leyenda-col">■</span> Columnas leídas
        </div>
      </div>
    </div>
  );
}

function DiagramaFinal() {
  const filas = [
    { etiqueta: 'SUBTOTAL', b: '120', c: '45',  resaltar: false },
    { etiqueta: 'SUBTOTAL', b: '267', c: '88',  resaltar: false },
    { etiqueta: 'SUBTOTAL', b: '890', c: '230', resaltar: true  },
  ];
  return (
    <div className="ms-diagrama">
      <span className="ms-diagrama-titulo">Así luce en el Excel</span>
      <div className="ms-excel-wrap">
        <div className="ms-excel-row ms-excel-header">
          <div className="ms-excel-cell ms-excel-cell--lbl" />
          {['B', 'C'].map(c => <div key={c} className="ms-excel-cell ms-excel-cell--col ms-col-dato">{c}</div>)}
        </div>
        {filas.map((f, i) => (
          <div key={i} className={`ms-excel-row ${f.resaltar ? 'ms-row--hit' : 'ms-row--repeat'}`}>
            <div className="ms-excel-cell ms-excel-cell--lbl">
              {f.resaltar
                ? <><span className="ms-arrow">▶</span>{f.etiqueta}</>
                : <span className="ms-repeat-badge">{f.etiqueta}</span>
              }
            </div>
            {[f.b, f.c].map((v, j) => (
              <div key={j} className={`ms-excel-cell ms-excel-cell--val ${f.resaltar ? 'ms-val--hit' : ''}`}>{v}</div>
            ))}
          </div>
        ))}
        <div className="ms-diagrama-leyenda">
          <span className="ms-leyenda-repeat">■</span> Palabra repetida (no única)
          <span className="ms-leyenda-sep" />
          <span className="ms-leyenda-hit">■</span> Última fila — la que se usa
        </div>
      </div>
    </div>
  );
}

function DiagramaFila() {
  const filas = [
    { num: 63, j: '...', resaltar: false },
    { num: 64, j: '...', resaltar: false },
    { num: 65, j: '890', resaltar: true  },
    { num: 66, j: '...', resaltar: false },
    { num: 67, j: '...', resaltar: false },
    { num: 68, j: '...', resaltar: false },
    { num: 69, j: '230', resaltar: true  },
  ];
  return (
    <div className="ms-diagrama">
      <span className="ms-diagrama-titulo">Así luce en el Excel</span>
      <div className="ms-excel-wrap ms-excel-wrap--chica">
        <div className="ms-excel-row ms-excel-header">
          <div className="ms-excel-cell ms-excel-cell--num">#</div>
          <div className="ms-excel-cell ms-excel-cell--col ms-col-dato">J</div>
        </div>
        {filas.map((f, i) => (
          <div key={i} className={`ms-excel-row ${f.resaltar ? 'ms-row--hit' : ''}`}>
            <div className="ms-excel-cell ms-excel-cell--num">
              {f.resaltar && <span className="ms-arrow">▶</span>}
              {f.num}
            </div>
            <div className={`ms-excel-cell ms-excel-cell--val ${f.resaltar ? 'ms-val--hit' : 'ms-val--vacio'}`}>
              {f.j}
            </div>
          </div>
        ))}
        <div className="ms-diagrama-leyenda">
          <span className="ms-leyenda-hit">■</span> Filas seleccionadas por número
        </div>
      </div>
    </div>
  );
}