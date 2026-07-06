import { useState, useEffect } from 'react';
import './listaIndicadores.css';
import { getAllIndicadores } from "../../api/indicadores";

// Carga dinámica de todos los iconos en assets — el nombre viene del back
const iconosAssets = import.meta.glob('../../../assets/icono_*.png', { eager: true });
const getIconSrc = (filename) =>
  iconosAssets[`../../../assets/${filename}`]?.default;

const ICO_STYLE = { width: 44, height: 44, objectFit: 'contain' };

const DEFAULT_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
  </svg>
);

// Colores de acento por categoría
const COLORS = {
  CAMA:        { bg: 'rgba(11,84,69,0.08)',    color: '#0b5445', selBg: '#0b5445' },
  CACU:        { bg: 'rgba(126,8,8,0.08)',     color: '#7e0808', selBg: '#7e0808' },
  EH:          { bg: 'rgba(154,112,38,0.1)',   color: '#9a7026', selBg: '#9a7026' },
  DM:          { bg: 'rgba(26,58,143,0.08)',   color: '#1a3a8f', selBg: '#1a3a8f' },
  MT:          { bg: 'rgba(6,95,70,0.08)',     color: '#065f46', selBg: '#065f46' },
  CUPN:        { bg: 'rgba(51,102,153,0.08)',  color: '#336699', selBg: '#1a4d80' },
  S_Ob:        { bg: 'rgba(180,83,9,0.08)',    color: '#b45309', selBg: '#b45309' },
  CE:          { bg: 'rgba(3,105,161,0.08)',   color: '#0369a1', selBg: '#0369a1' },
};

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function ListaIndicadores({ indicadorSel, setIndicadorSel }) {
  const [categoria, setCategoria] = useState(() =>
    sessionStorage.getItem('categoria_actual') || 'CAMA'
  );
  const [AllIndicadores, setAllIndicadores] = useState({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    sessionStorage.setItem('categoria_actual', categoria);
  }, [categoria]);

  useEffect(() => {
    const traer = async () => {
      try {
        const res = await getAllIndicadores();
        const data = res.data;
        setAllIndicadores(data);
        const claves = Object.keys(data);
        if (claves.length > 0 && !data[categoria]) setCategoria(claves[0]);
      } catch (e) {
        console.error(e);
      } finally {
        setCargando(false);
      }
    };
    traer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiarCategoria = (cat) => {
    setCategoria(cat);
    setIndicadorSel(null);
  };

  const categorias     = Object.keys(AllIndicadores);
  const color          = COLORS[categoria] || COLORS.CAMA;
  const catData        = AllIndicadores[categoria];
  const indicadores    = catData?.indicadores ?? [];
  const iconoCategoria = catData?.icono;

  const renderIcono = (icono) => {
    const src = getIconSrc(icono);
    return src
      ? <img src={src} style={ICO_STYLE} alt={categoria} />
      : DEFAULT_ICON;
  };

  return (
    <div className="li-wrapper">

      {/* ── Tabs ── */}
      <div className="li-tabs-bar">
        <nav className="li-tabs-scroll">
          {cargando
            ? [1,2,3,4,5].map(i => <div key={i} className="li-tab-shimmer" />)
            : categorias.map(cat => {
                const c = COLORS[cat] || COLORS.CAMA;
                return (
                  <button
                    key={cat}
                    className={`li-tab ${categoria === cat ? 'li-tab--active' : ''}`}
                    style={categoria === cat ? { background: c.selBg, borderColor: c.selBg, '--tab-color': c.selBg } : {}}
                    onClick={() => cambiarCategoria(cat)}
                  >
                    {cat}
                  </button>
                );
              })
          }
        </nav>
        {!cargando && (
          <span className="li-count">{indicadores.length} indicadores</span>
        )}
      </div>

      {/* ── Grid ── */}
      {cargando ? (
        <div className="li-shimmer-grid">
          {[1,2,3,4,5,6].map(i => <div key={i} className="li-shimmer-card" />)}
        </div>
      ) : (
        <div className="li-grid" key={categoria}>
          {indicadores.map((ind, idx) => {
            const sel = indicadorSel === ind;
            return (
              <div
                key={ind}
                className={`li-card ${sel ? 'li-card--sel' : ''}`}
                style={{
                  animationDelay: `${idx * 0.04}s`,
                  '--cat-color': color.color,
                  '--cat-bg':    color.bg,
                  '--cat-sel':   color.selBg,
                }}
                onClick={() => setIndicadorSel(sel ? null : ind)}
              >
                {sel && <div className="li-card-sel-bar" />}

                <div className="li-card-visual">
                  <div className="li-card-deco" />
                  <div className={`li-card-icon ${sel ? 'li-card-icon--sel' : ''}`}>
                    {sel ? <IconCheck /> : renderIcono(iconoCategoria)}
                  </div>
                </div>

                <div className="li-card-footer">
                  <span className="li-card-name">{ind}</span>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
