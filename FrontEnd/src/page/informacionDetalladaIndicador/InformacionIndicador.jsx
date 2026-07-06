import React from 'react';
import './informacionIndicador.css';
import { parsearNumerador, parsearDenominador, parsearResultado, descripcionExtraccion, pct } from './operacionParser.js';

// ── Tarjeta de una fuente individual ─────────────────────────────────────────
const TarjetaFuente = ({ fuente }) => {
  const todasCols = fuente.grupos.flatMap(g => g.cols);
  const extraccion = descripcionExtraccion(fuente.cfg, todasCols);

  // LIMPIEZA VISUAL: "CP03_A" -> "CP03"
  const idVisual = fuente.id.split('_')[0];

  return (
    <div className="fuente-card">
      <div className="fuente-card-header">
        <span className="fc-id">{idVisual}</span>
        <span className="fc-sep">·</span>
        <span className="fc-hoja">{fuente.hoja}</span>
        {fuente.cfg?.modo && <span className="fc-modo">{fuente.cfg.modo}</span>}
      </div>
      {extraccion && <p className="fc-extraccion">{extraccion}</p>}
      <div className="fc-grupos">
        {fuente.grupos.map((g, i) => (
          <div key={i} className={`fc-grupo ${g.prev ? 'con-prev' : ''}`}>
            <div className="tags-flex">
              {g.cols.map((c, j) => (
                <span key={j} className={`col-tag ${g.prev ? 'col-tag-prev' : ''}`}>{c}</span>
              ))}
              {g.prev && <span className="prev-badge">−{(parseFloat(g.prev)*100).toFixed(1)}% prevalencia a descontar </span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Bloque de un paso (numerador o denominador) ───────────────────────────────
const BloquePaso = ({ num, titulo, descripcion, parsed }) => {
  if (parsed.tipo === 'producto') {
    return (
      <div className="paso">
        <div className="paso-header">
          <span className="paso-num">{num}</span>
          <strong>{titulo}</strong>
        </div>
        <p className="paso-desc">{descripcion}</p>
        <div className="fuentes-wrap">
          {parsed.fuentes.map((f, i) => <TarjetaFuente key={i} fuente={f} />)}
        </div>
        <div className="operacion-box">
          <span className="op-lbl">Operación:</span>
          <code>{parsed.operacion}</code>
        </div>
        <p className="resumen-op">{parsed.resumen}</p>
      </div>
    );
  }

  const { fuentes, hasPrev, operacion, resumen } = parsed;

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

      <div className="fuentes-wrap">
        {fuentes.map((f, i) => <TarjetaFuente key={i} fuente={f} />)}
      </div>

      {fuentes.length > 0 && (
        <>
          <div className="operacion-box">
            <span className="op-lbl">Operación:</span>
            <code>{operacion}</code>
          </div>
          <p className="resumen-op">{resumen}</p>
        </>
      )}
    </div>
  );
};

// ── Semáforo ──────────────────────────────────────────────────────────────────
const SemaforoFijo = ({ semaforo }) => {
  const esDec = 'Alto' in semaforo;
  return (
    <div className="metas-fijas-row">
      {esDec ? (
        <>
          <div className="meta-blk meta-verde"><span className="meta-lbl">Esperado</span><span className="meta-val">≤ {semaforo.Esperado}</span></div>
          <div className="meta-blk meta-amarillo"><span className="meta-lbl">Medio</span><span className="meta-val">&gt; {semaforo.Esperado} - &lt; {semaforo.Alto}</span></div>
          <div className="meta-blk meta-rojo"><span className="meta-lbl">Alto</span><span className="meta-val">≥ {semaforo.Alto}</span></div>
        </>
      ) : (
        <>
          <div className="meta-blk meta-rojo"><span className="meta-lbl">Bajo</span><span className="meta-val">≤ {semaforo.Bajo}</span></div>
          <div className="meta-blk meta-amarillo"><span className="meta-lbl">Medio</span><span className="meta-val">&gt; {semaforo.Bajo} - &lt; {semaforo.Esperado}</span></div>
          <div className="meta-blk meta-verde"><span className="meta-lbl">Esperado</span><span className="meta-val">≥ {semaforo.Esperado}</span></div>
        </>
      )}
    </div>
  );
};

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
            <td className="cell-critico">≤ {v.Bajo}%</td>
            <td className="cell-regular">&gt; {v.Bajo}% y &lt; {v.Esperado}%</td>
            <td className="cell-esperado">≥ {v.Esperado}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Principal ─────────────────────────────────────────────────────────────────
const InformacionIndicador = ({ data }) => {
  if (!data) return <div className="loading-state">Seleccione un indicador...</div>;

  const { titulo, fechaModificacion, descripcionNumerador, descripcionDenominador, reporte, operacion, semaforo } = data;

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const esMensual = MESES.some(mes => Object.prototype.hasOwnProperty.call(semaforo, mes));

  const parsedNum = parsearNumerador(operacion.numerador, reporte);
  const parsedDen = parsearDenominador(operacion.denominador, reporte);
  const textoRes  = parsearResultado(operacion.resultado);

  return (
    <div className="detalle-container">
      <header className="detalle-header">
        <div className="header-meta">
          <span className="badge-tecnico">Ficha técnica del indicador</span>
          <span className="fecha-ref">Última revisión: {fechaModificacion}</span>
        </div>
        <h1 className="detalle-titulo">{titulo}</h1>
      </header>

      <div className="detalle-layout">
        <section className="detalle-card highlight">
          <div className="card-title">
            <span className="icon">⚙️</span>
            <h2>Cálculo del indicador</h2>
            <span className="ftp-badge">Fuente: FTP</span>
          </div>
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
            <div className="formula-final-box">
              <label>Resultado final:</label>
              <code>{textoRes}</code>
            </div>
          </div>
        </section>

        <section className="detalle-card">
          <div className="card-title">
            <span className="icon">📊</span>
            <h2>Rangos de Desempeño</h2>
            <span className="tag-tipo-sem">{esMensual ? 'Rangos de desempeño mensual' : 'Meta fija'}</span>
          </div>
          {esMensual ? <SemaforoMensual semaforo={semaforo} /> : <SemaforoFijo semaforo={semaforo} />}
        </section>
      </div>
    </div>
  );
};

export default InformacionIndicador;