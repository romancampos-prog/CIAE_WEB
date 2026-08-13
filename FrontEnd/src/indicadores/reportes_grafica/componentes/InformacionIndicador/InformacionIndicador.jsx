import React, { useState } from 'react';
import './informacionIndicador.css';
import { parsearNumerador, parsearDenominador, parsearResultado, descripcionExtraccion, pct } from './operacionParser.js';

// ── Tarjeta de fuente — colapsable ────────────────────────────────────────────
const TarjetaFuente = ({ fuente }) => {
  const [abierta, setAbierta] = useState(false);
  const todasCols  = fuente.grupos.flatMap(g => g.cols);
  const extraccion = descripcionExtraccion(fuente.cfg, todasCols);
  const idVisual   = fuente.id.split('_')[0];
  const numCols    = todasCols.length;

  return (
    <div className={`fuente-card ${abierta ? 'fuente-card--open' : ''}`}>
      <button className="fuente-card-toggle" onClick={() => setAbierta(v => !v)}>
        <div className="fc-labels">
          <span className="fc-id">{idVisual}</span>
          <span className="fc-sep">·</span>
          <span className="fc-hoja">{fuente.hoja}</span>
          {fuente.cfg?.modo && <span className="fc-modo">{fuente.cfg.modo}</span>}
        </div>
        <div className="fc-toggle-right">
          {!abierta && numCols > 0 && (
            <span className="fc-col-count">{numCols} col{numCols !== 1 ? 's' : ''}</span>
          )}
          <svg
            className={`fc-chevron ${abierta ? 'fc-chevron--open' : ''}`}
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {abierta && (
        <div className="fuente-card-body">
          {extraccion && <p className="fc-extraccion">{extraccion}</p>}
          <div className="fc-grupos">
            {fuente.grupos.map((g, i) => (
              <div key={i} className={`fc-grupo ${g.prev ? 'con-prev' : ''}`}>
                <div className="tags-flex">
                  {g.cols.map((c, j) => (
                    <span key={j} className={`col-tag ${g.prev ? 'col-tag-prev' : ''}`}>{c}</span>
                  ))}
                  {g.prev && (
                    <span className="prev-badge">−{(parseFloat(g.prev) * 100).toFixed(1)}% prevalencia a descontar</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Bloque de un paso ─────────────────────────────────────────────────────────
const BloquePaso = ({ num, titulo, descripcion, parsed }) => {
  const { fuentes, hasPrev, operacion, resumen } = parsed.tipo === 'producto'
    ? { fuentes: parsed.fuentes, hasPrev: false, operacion: parsed.operacion, resumen: parsed.resumen }
    : parsed;

  return (
    <div className="paso">
      <div className="paso-header">
        <span className="paso-num">{num}</span>
        <strong>{titulo}</strong>
      </div>
      <p className="paso-desc">{descripcion}</p>

      {hasPrev && (
        <p className="nota-prevalencia">
          Antes de sumar, restar el porcentaje de prevalencia por grupo de edad.
        </p>
      )}

      {fuentes?.length > 0 && (
        <div className="fuentes-wrap">
          {fuentes.map((f, i) => <TarjetaFuente key={i} fuente={f} />)}
        </div>
      )}

      {fuentes?.length > 0 && (
        <div className="operacion-box">
          <span className="op-lbl">Operación:</span>
          <code>{operacion}</code>
        </div>
      )}
      {resumen && <p className="resumen-op">{resumen}</p>}
    </div>
  );
};

// ── Helpers de umbral: soportan formato legado (numero puro) y explícito
//    (texto con operador, ej. "<= 30") -- ver shared/semaforo_service.py ──────
const numeroDe = (valor) => {
  if (typeof valor === 'number') return valor;
  const m = String(valor).match(/-?\d+\.?\d*/);
  return m ? parseFloat(m[0]) : NaN;
};

// Si ya viene explícito ("<= 30") se muestra tal cual; si es legado (30), se
// arma con el operador que el propio backend usaba de forma implícita.
const textoUmbral = (valor, operadorLegado) =>
  typeof valor === 'string' ? valor : `${operadorLegado} ${valor}`;

// ── Semáforo fijo ─────────────────────────────────────────────────────────────
const SemaforoFijo = ({ semaforo }) => {
  const esDec = 'Alto' in semaforo;
  const critico = esDec ? semaforo.Alto : semaforo.Bajo;
  // Cuando Esperado y el umbral crítico son el mismo número no existe franja
  // "Medio" (ancho cero) -- el propio evaluar_color() nunca clasifica nada
  // como Medio en ese caso, así que tampoco se dibuja.
  const sinMedio = numeroDe(semaforo.Esperado) === numeroDe(critico);
  return (
    <div className="metas-fijas-row">
      {esDec ? (
        <>
          <div className="meta-blk meta-verde">   <span className="meta-lbl">Esperado</span><span className="meta-val">{textoUmbral(semaforo.Esperado, '≤')}</span></div>
          {!sinMedio && (
            <div className="meta-blk meta-amarillo"><span className="meta-lbl">Medio</span>   <span className="meta-val">&gt; {numeroDe(semaforo.Esperado)} — &lt; {numeroDe(semaforo.Alto)}</span></div>
          )}
          <div className="meta-blk meta-rojo">    <span className="meta-lbl">Alto</span>    <span className="meta-val">{textoUmbral(semaforo.Alto, sinMedio ? '>' : '≥')}</span></div>
        </>
      ) : (
        <>
          <div className="meta-blk meta-rojo">    <span className="meta-lbl">Bajo</span>    <span className="meta-val">{textoUmbral(semaforo.Bajo, sinMedio ? '<' : '≤')}</span></div>
          {!sinMedio && (
            <div className="meta-blk meta-amarillo"><span className="meta-lbl">Medio</span>   <span className="meta-val">&gt; {numeroDe(semaforo.Bajo)} — &lt; {numeroDe(semaforo.Esperado)}</span></div>
          )}
          <div className="meta-blk meta-verde">   <span className="meta-lbl">Esperado</span><span className="meta-val">{textoUmbral(semaforo.Esperado, '≥')}</span></div>
        </>
      )}
    </div>
  );
};

// ── Semáforo mensual ──────────────────────────────────────────────────────────
const SemaforoMensual = ({ semaforo }) => (
  <div className="table-responsive">
    <table className="tabla-evaluacion">
      <thead>
        <tr>
          <th>Mes</th>
          <th className="c-critico">Bajo</th>
          <th className="c-regular">Medio</th>
          <th className="c-esperado">Esperado</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(semaforo).map(([mes, v]) => (
          <tr key={mes}>
            <td>{mes}</td>
            <td className="cell-critico">{textoUmbral(v.Bajo, '≤')}%</td>
            <td className="cell-regular">&gt; {numeroDe(v.Bajo)}% y &lt; {numeroDe(v.Esperado)}%</td>
            <td className="cell-esperado">{textoUmbral(v.Esperado, '≥')}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Principal ─────────────────────────────────────────────────────────────────
const InformacionIndicador = ({ data }) => {
  const [tab, setTab] = useState('calculo');

  if (!data) return <div className="loading-state">Seleccione un indicador...</div>;

  const { titulo, fechaModificacion, descripcionNumerador, descripcionDenominador,
          reporte, operacion, semaforo } = data;

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const esMensual  = MESES.some(mes => Object.prototype.hasOwnProperty.call(semaforo, mes));
  const parsedNum  = parsearNumerador(operacion.numerador, reporte);
  const parsedDen  = parsearDenominador(operacion.denominador, reporte);
  const textoRes   = parsearResultado(operacion.resultado);

  return (
    <div className="detalle-container">

      {/* ── Título completo + fecha (reemplaza el header duplicado) ── */}
      <div className="det-top">
        <h1 className="det-titulo-full">{titulo}</h1>
        <div className="det-meta-row">
          <span className="fecha-ref">Última revisión: {fechaModificacion}</span>
          <span className="ftp-badge">Fuente: FTP</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="det-tabs">
        <button
          className={`det-tab ${tab === 'calculo' ? 'det-tab--active' : ''}`}
          onClick={() => setTab('calculo')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
          </svg>
          Cálculo
        </button>
        <button
          className={`det-tab ${tab === 'semaforo' ? 'det-tab--active' : ''}`}
          onClick={() => setTab('semaforo')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Rangos de desempeño
        </button>
      </div>

      {/* ── Contenido por tab ── */}
      {tab === 'calculo' && (
        <div className="det-tab-body">
          <div className="proceso-pasos">
            <BloquePaso
              num="1"
              titulo="Numerador — ¿qué indica?"
              descripcion={descripcionNumerador}
              parsed={parsedNum}
            />
            <BloquePaso
              num="2"
              titulo="Denominador — ¿qué indica?"
              descripcion={descripcionDenominador}
              parsed={parsedDen}
            />
          </div>
          <div className="formula-final-box">
            <label>Resultado final:</label>
            <code>{textoRes}</code>
          </div>
        </div>
      )}

      {tab === 'semaforo' && (
        <div className="det-tab-body">
          <p className="det-sem-tipo">
            {esMensual ? 'Las metas varían cada mes del año.' : 'Meta fija para todos los meses.'}
          </p>
          {esMensual
            ? <SemaforoMensual semaforo={semaforo} />
            : <SemaforoFijo   semaforo={semaforo} />
          }
        </div>
      )}

    </div>
  );
};

export default InformacionIndicador;
