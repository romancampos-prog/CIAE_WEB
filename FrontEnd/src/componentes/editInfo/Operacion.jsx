import { useState, useMemo } from 'react';
import { Field } from '../../page/editInfo/editInfo';
import ModoSelector from './metodos';

// ─── Utilidades ───────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);

const getChips = (reporte) => {
  const chips = [];
  Object.entries(reporte || {}).forEach(([fId, cfg]) => {
    (cfg.columna_dato || []).forEach((col, idx) => {
      chips.push({ key: `${fId}:${idx}`, fId, col, idx });
    });
  });
  return chips;
};

// ─── Generadores de fórmula ───────────────────────────────────────────────────
const colsToExpr = (colKeys) => {
  if (!colKeys || colKeys.length === 0) return null;
  const byFuente = {};
  colKeys.forEach(key => {
    const [f, i] = key.split(':');
    (byFuente[f] = byFuente[f] || []).push(parseInt(i));
  });
  return Object.entries(byFuente).map(([f, indices]) => {
    const s = [...indices].sort((a, b) => a - b);
    if (s.length === 1) return `${f}[${s[0]}]`;
    const contig = s.every((v, i) => i === 0 || v === s[i - 1] + 1);
    if (contig) return `sum(${f}[${s[0]}:${s[s.length - 1] + 1}])`;
    return s.map(i => `${f}[${i}]`).join(' + ');
  }).join(' + ');
};

const grupoToExpr = (g) => {
  const base = colsToExpr(g.cols);
  if (!base) return null;
  if (!g.usaPrevalencia || !g.pct) return base;
  const f = (parseFloat(g.pct) / 100).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return `(${base} * (1 - ${f}))`;
};

const buildNumerador = (terminos) => {
  const exprs = terminos.map(t => colsToExpr(t.cols)).filter(Boolean);
  return exprs.length > 0 ? exprs.join(' + ') : '—';
};

const buildDenominador = (grupos) => {
  const exprs = grupos.map(grupoToExpr).filter(Boolean);
  if (exprs.length === 0) return '—';
  if (exprs.length === 1) return exprs[0];
  return `sum([${exprs.join(', ')}])`;
};

const buildResultado = (tipo) =>
  tipo === 'porcentaje'
    ? 'round((numerador / denominador) * 100, 2)'
    : 'round((numerador / denominador), 2)';

const buildOperacion = (b) => ({
  numerador:   buildNumerador(b.numeradorTerminos).replace('—', ''),
  denominador: buildDenominador(b.denominadorGrupos).replace('—', ''),
  resultado:   buildResultado(b.resultado),
});

// ─── Constantes de fuentes ────────────────────────────────────────────────────
const FUENTE_VACIA = {
  hoja: '', modo: 'INTERSECCION', columna_etiqueta: '', texto_buscar: '', columna_dato: [],
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Operacion({ form, setField, onChangeFuente, onSave }) {
  const [builder, setBuilder] = useState({
    resultado:         'porcentaje',
    numeradorTerminos: [{ _id: uid(), fuenteId: '', cols: [] }],
    denominadorGrupos: [{ _id: uid(), cols: [], usaPrevalencia: false, pct: '' }],
  });
  const [modoManual, setModoManual]   = useState(false);
  const [agregando, setAgregando]     = useState(false);
  const [nuevaClave, setNuevaClave]   = useState('');
  const [nuevaConfig, setNuevaConfig] = useState({ ...FUENTE_VACIA });
  const [claveError, setClaveError]   = useState('');
  const [pickerNum, setPickerNum]     = useState(null);
  const [pickerDen, setPickerDen]     = useState(null);

  const infoInicial = useMemo(() => JSON.parse(JSON.stringify(form)), []);
  const cambio      = JSON.stringify(form) !== JSON.stringify(infoInicial);
  const chips       = useMemo(() => getChips(form.reporte), [form.reporte]);
  const claves      = Object.keys(form.reporte || {});
  const fuentes     = Object.entries(form.reporte || {});

  const sync = (nb) => { setBuilder(nb); setField('operacion', buildOperacion(nb)); };

  // ── Numerador ─────────────────────────────────────────────────────────────
  const addTermino  = ()       => sync({ ...builder, numeradorTerminos: [...builder.numeradorTerminos, { _id: uid(), fuenteId: '', cols: [] }] });
  const delTermino  = (i)      => sync({ ...builder, numeradorTerminos: builder.numeradorTerminos.filter((_, idx) => idx !== i) });
  const updTermino  = (i, p)   => sync({ ...builder, numeradorTerminos: builder.numeradorTerminos.map((t, idx) => idx === i ? { ...t, ...p } : t) });
  const addColNum   = (i, key) => { if (!builder.numeradorTerminos[i].cols.includes(key)) updTermino(i, { cols: [...builder.numeradorTerminos[i].cols, key] }); setPickerNum(null); };
  const delColNum   = (i, key) => updTermino(i, { cols: builder.numeradorTerminos[i].cols.filter(k => k !== key) });

  // ── Denominador ───────────────────────────────────────────────────────────
  const addGrupo    = ()       => sync({ ...builder, denominadorGrupos: [...builder.denominadorGrupos, { _id: uid(), cols: [], usaPrevalencia: false, pct: '' }] });
  const delGrupo    = (i)      => sync({ ...builder, denominadorGrupos: builder.denominadorGrupos.filter((_, idx) => idx !== i) });
  const updGrupo    = (i, p)   => sync({ ...builder, denominadorGrupos: builder.denominadorGrupos.map((g, idx) => idx === i ? { ...g, ...p } : g) });
  const addColGrupo = (i, key) => { if (!builder.denominadorGrupos[i].cols.includes(key)) updGrupo(i, { cols: [...builder.denominadorGrupos[i].cols, key] }); setPickerDen(null); };
  const delColGrupo = (i, key) => updGrupo(i, { cols: builder.denominadorGrupos[i].cols.filter(k => k !== key) });

  // ── Fuentes ───────────────────────────────────────────────────────────────
  const handleEliminar = (id) => { const { [id]: _, ...resto } = form.reporte; setField('reporte', resto); };
  const handleAgregar  = () => {
    const clave = nuevaClave.trim().toUpperCase();
    if (!clave)                { setClaveError('Escribe una clave.'); return; }
    if (form.reporte?.[clave]) { setClaveError('Esa clave ya existe.'); return; }
    onChangeFuente(clave, { ...nuevaConfig });
    setNuevaClave(''); setNuevaConfig({ ...FUENTE_VACIA }); setClaveError(''); setAgregando(false);
  };

  return (
    <div className="ei-card">
      <div className="ei-card-header">
        <span className="ei-card-num">02</span>
        <div>
          <h2 className="ei-card-titulo">Configuración Técnica</h2>
          <p className="ei-card-desc">Fuentes de datos y fórmulas de cálculo del indicador</p>
        </div>
      </div>

      <div className="ei-card-body">

        {/* ════ FUENTES ════ */}
        <section className="ei-card-section">
          <h3 className="ei-section-title">📁 Fuentes de datos</h3>

          {fuentes.length === 0 && !agregando && (
            <p style={{ textAlign: 'center', color: '#bbb', fontSize: '13px', padding: '1rem 0' }}>
              No hay fuentes configuradas. Agrega una para comenzar.
            </p>
          )}

          {fuentes.map(([id, cfg]) => (
            <FuenteCard key={id} id={id} config={cfg}
              onChange={(c) => onChangeFuente(id, c)}
              onEliminar={() => handleEliminar(id)} />
          ))}

          {agregando ? (
            <div className="ei-fuente-nueva">
              <span className="ei-fuente-nueva-titulo">➕ Nueva fuente</span>
              <Field label="Clave de referencia" hint="Esta clave la usarás en las fórmulas (ej: CP02, PB02)">
                <input
                  className={`ei-input ei-mono ${claveError ? 'ei-input-error' : ''}`}
                  placeholder="Ej: CP02" value={nuevaClave} style={{ maxWidth: '180px' }}
                  onChange={e => { setNuevaClave(e.target.value.toUpperCase()); setClaveError(''); }}
                />
                {claveError && <span className="ei-error-msg">{claveError}</span>}
              </Field>
              <FuenteForm config={nuevaConfig} onChange={setNuevaConfig} />
              <div className="ei-fuente-nueva-actions">
                <button className="ei-btn-confirmar" onClick={handleAgregar}>✅ Confirmar fuente</button>
                <button className="ei-btn-cancelar" onClick={() => { setAgregando(false); setNuevaClave(''); setNuevaConfig({ ...FUENTE_VACIA }); setClaveError(''); }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button className="ei-btn-agregar-fuente" onClick={() => setAgregando(true)}>
              + Agregar fuente de datos
            </button>
          )}
        </section>

        <hr className="ei-divider" />

        {/* ════ FÓRMULAS ════ */}
        <section className="ei-card-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="ei-section-title" style={{ margin: 0 }}>⚙️ Fórmulas de cálculo</h3>
            <button className="ei-modo-toggle" onClick={() => setModoManual(v => !v)}>
              {modoManual ? '🧱 Usar constructor' : '✏️ Modo manual'}
            </button>
          </div>

          {!modoManual && chips.length === 0 && (
            <p style={{ textAlign: 'center', color: '#ccc', fontSize: '13px', padding: '1rem 0' }}>
              Configura primero las fuentes y sus columnas para usar el constructor.
            </p>
          )}

          {modoManual ? (
            /* ── MODO MANUAL ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Field label="Numerador">
                <textarea className="ei-textarea ei-mono" rows={2} value={form.operacion?.numerador ?? ''}
                  onChange={e => setField('operacion', { ...form.operacion, numerador: e.target.value })} />
              </Field>
              <Field label="Denominador">
                <textarea className="ei-textarea ei-mono" rows={2} value={form.operacion?.denominador ?? ''}
                  onChange={e => setField('operacion', { ...form.operacion, denominador: e.target.value })} />
              </Field>
              <Field label="Resultado Final">
                <textarea className="ei-textarea ei-mono" rows={2} value={form.operacion?.resultado ?? ''}
                  onChange={e => setField('operacion', { ...form.operacion, resultado: e.target.value })} />
              </Field>
            </div>
          ) : chips.length > 0 && (
            /* ── CONSTRUCTOR VISUAL ── */
            <div className="ei-builder">

              {/* RESULTADO */}
              <div className="ei-builder-bloque">
                <span className="ei-builder-label">Tipo de resultado</span>
                <div className="ei-resultado-pills">
                  {[
                    { v: 'porcentaje', icon: '%', txt: 'Porcentaje',       sub: '÷ denominador × 100' },
                    { v: 'directo',    icon: '÷', txt: 'Promedio / Ratio', sub: '÷ denominador'       },
                  ].map(op => (
                    <button key={op.v}
                      className={`ei-resultado-pill ${builder.resultado === op.v ? 'activo' : ''}`}
                      onClick={() => sync({ ...builder, resultado: op.v })}>
                      <span className="ei-resultado-icon">{op.icon}</span>
                      <span className="ei-resultado-txt">{op.txt}</span>
                      <span className="ei-resultado-sub">{op.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* NUMERADOR */}
              <div className="ei-builder-bloque">
                <span className="ei-builder-label">Numerador</span>
                <span className="ei-builder-hint">Cada término se suma al siguiente</span>
                {builder.numeradorTerminos.map((term, i) => (
                  <TerminoCard key={term._id}
                    term={term} idx={i} chips={chips} claves={claves}
                    pickerAbierto={pickerNum === i}
                    onTogglePicker={() => setPickerNum(pickerNum === i ? null : i)}
                    onChangeFuente={(fId) => { updTermino(i, { fuenteId: fId, cols: [] }); setPickerNum(null); }}
                    onAddCol={(key) => addColNum(i, key)}
                    onDelCol={(key) => delColNum(i, key)}
                    onEliminar={() => delTermino(i)}
                    mostrarEliminar={builder.numeradorTerminos.length > 1}
                  />
                ))}
                <button className="ei-btn-add-termino" onClick={addTermino}>+ Agregar término</button>
              </div>

              {/* DENOMINADOR */}
              <div className="ei-builder-bloque">
                <span className="ei-builder-label">Denominador</span>
                <span className="ei-builder-hint">Agrupa las columnas que comparten la misma prevalencia</span>
                {builder.denominadorGrupos.map((grupo, i) => (
                  <GrupoCard key={grupo._id}
                    grupo={grupo} idx={i} chips={chips}
                    pickerAbierto={pickerDen === i}
                    onTogglePicker={() => setPickerDen(pickerDen === i ? null : i)}
                    onAddCol={(key) => addColGrupo(i, key)}
                    onDelCol={(key) => delColGrupo(i, key)}
                    onUpdate={(p)   => updGrupo(i, p)}
                    onEliminar={()  => delGrupo(i)}
                    mostrarEliminar={builder.denominadorGrupos.length > 1}
                  />
                ))}
                <button className="ei-btn-add-termino" onClick={addGrupo}>+ Nuevo grupo</button>
              </div>

              {/* PREVIEW */}
              <div className="ei-preview-wrap">
                <span className="ei-preview-titulo">📋 Fórmula generada</span>
                <div className="ei-preview-rows">
                  <div className="ei-preview-line">
                    <span className="ei-preview-lbl">numerador</span>
                    <code className="ei-preview-code">{buildNumerador(builder.numeradorTerminos)}</code>
                  </div>
                  <div className="ei-preview-line">
                    <span className="ei-preview-lbl">denominador</span>
                    <code className="ei-preview-code">{buildDenominador(builder.denominadorGrupos)}</code>
                  </div>
                  <div className="ei-preview-line ei-preview-line--hl">
                    <span className="ei-preview-lbl">resultado</span>
                    <code className="ei-preview-code">{buildResultado(builder.resultado)}</code>
                  </div>
                </div>
              </div>

            </div>
          )}
        </section>
      </div>

      <div className="ei-card-footer">
        <button className="ei-btn-save" onClick={onSave} disabled={!cambio}
          style={{ opacity: cambio ? 1 : 0.55, cursor: cambio ? 'pointer' : 'not-allowed',
            backgroundColor: cambio ? undefined : '#ccc', backgroundImage: cambio ? undefined : 'none', boxShadow: cambio ? undefined : 'none' }}>
          {cambio ? <><span>💾</span> Guardar Configuración Técnica</> : <><span>✅</span> Configuración al día</>}
        </button>
      </div>
    </div>
  );
}

// ─── TerminoCard (Numerador) ──────────────────────────────────────────────────
function TerminoCard({ term, idx, chips, claves, pickerAbierto, onTogglePicker, onChangeFuente, onAddCol, onDelCol, onEliminar, mostrarEliminar }) {
  const chipsDisponibles = chips.filter(c => c.fId === term.fuenteId && !term.cols.includes(c.key));

  return (
    <div className="ei-grupo-card">
      <div className="ei-grupo-header">
        <span className="ei-grupo-num">Término {idx + 1}</span>
        {mostrarEliminar && (
          <button className="ei-fuente-btn-eliminar" onClick={onEliminar} title="Eliminar término">🗑</button>
        )}
      </div>

      {/* Selector de fuente */}
      <div className="ei-termino-fuente-row">
        <span className="ei-termino-fuente-label">Documento</span>
        <div className="ei-termino-fuente-pills">
          {claves.length === 0
            ? <span style={{ fontSize: '12px', color: '#ccc' }}>Sin fuentes configuradas</span>
            : claves.map(k => (
              <button key={k}
                className={`ei-fuente-pill ${term.fuenteId === k ? 'ei-fuente-pill--activo' : ''}`}
                onClick={() => onChangeFuente(k)}>
                {k}
              </button>
            ))
          }
        </div>
      </div>

      {/* Columnas — solo si hay fuente seleccionada */}
      {term.fuenteId && (
        <div className="ei-grupo-cols">
          {term.cols.length === 0 && <span className="ei-grupo-empty">Sin columnas — añade con el botón</span>}
          {term.cols.map(key => {
            const chip = chips.find(c => c.key === key);
            if (!chip) return null;
            return (
              <span key={key} className="ei-col-chip ei-col-chip--sel ei-col-chip--sm">
                <span className="ei-col-chip-col">{chip.col}</span>
                <button className="ei-tag-remove" onClick={() => onDelCol(key)}>×</button>
              </span>
            );
          })}
          <div style={{ position: 'relative' }}>
            <button className="ei-grupo-add-col" onClick={onTogglePicker}>
              {pickerAbierto ? '✕' : '+ Columna'}
            </button>
            {pickerAbierto && (
              <div className="ei-col-picker">
                {chipsDisponibles.length === 0
                  ? <span style={{ fontSize: '11px', color: '#bbb' }}>No quedan columnas</span>
                  : chipsDisponibles.map(chip => (
                    <button key={chip.key} className="ei-col-chip ei-col-chip--sm" onClick={() => onAddCol(chip.key)}>
                      <span className="ei-col-chip-col">{chip.col}</span>
                    </button>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GrupoCard (Denominador) ──────────────────────────────────────────────────
function GrupoCard({ grupo, idx, chips, pickerAbierto, onTogglePicker, onAddCol, onDelCol, onUpdate, onEliminar, mostrarEliminar }) {
  const disponibles = chips.filter(c => !grupo.cols.includes(c.key));

  return (
    <div className="ei-grupo-card">
      <div className="ei-grupo-header">
        <span className="ei-grupo-num">Grupo {idx + 1}</span>
        {mostrarEliminar && (
          <button className="ei-fuente-btn-eliminar" onClick={onEliminar} title="Eliminar grupo">🗑</button>
        )}
      </div>

      <div className="ei-grupo-cols">
        {grupo.cols.length === 0 && <span className="ei-grupo-empty">Sin columnas — añade con el botón</span>}
        {grupo.cols.map(key => {
          const chip = chips.find(c => c.key === key);
          if (!chip) return null;
          return (
            <span key={key} className="ei-col-chip ei-col-chip--sel ei-col-chip--sm">
              <span className="ei-col-chip-fuente">{chip.fId}</span>
              <span className="ei-col-chip-col">{chip.col}</span>
              <button className="ei-tag-remove" onClick={() => onDelCol(key)}>×</button>
            </span>
          );
        })}
        <div style={{ position: 'relative' }}>
          <button className="ei-grupo-add-col" onClick={onTogglePicker}>
            {pickerAbierto ? '✕' : '+ Columna'}
          </button>
          {pickerAbierto && (
            <div className="ei-col-picker">
              {disponibles.length === 0
                ? <span style={{ fontSize: '11px', color: '#bbb' }}>No quedan columnas disponibles</span>
                : disponibles.map(chip => (
                  <button key={chip.key} className="ei-col-chip ei-col-chip--sm" onClick={() => onAddCol(chip.key)}>
                    <span className="ei-col-chip-fuente">{chip.fId}</span>
                    <span className="ei-col-chip-col">{chip.col}</span>
                  </button>
                ))
              }
            </div>
          )}
        </div>
      </div>

      <div className="ei-grupo-prevalencia">
        <label className="ei-toggle-label">
          <input type="checkbox" checked={!!grupo.usaPrevalencia}
            onChange={e => onUpdate({ usaPrevalencia: e.target.checked, pct: '' })} />
          <span className="ei-toggle-track" />
        </label>
        <span className="ei-grupo-prev-label">Ajuste de prevalencia</span>
        {grupo.usaPrevalencia && (
          <div className="ei-prevalencia-input-wrap">
            <input className="ei-input ei-mono" type="number" min={0} max={100} step={0.01}
              value={grupo.pct} placeholder="0.0" style={{ maxWidth: '76px', textAlign: 'right' }}
              onChange={e => onUpdate({ pct: e.target.value })} />
            <span className="ei-prevalencia-pct">%</span>
            {grupo.pct && (
              <span className="ei-prevalencia-factor">
                = {(parseFloat(grupo.pct) / 100).toFixed(4).replace(/0+$/, '')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FuenteCard ───────────────────────────────────────────────────────────────
function FuenteCard({ id, config, onChange, onEliminar }) {
  const [expandida, setExpandida] = useState(false);
  const numCols = config.columna_dato?.length ?? 0;
  const modoLabel = { INTERSECCION: '🔍 Por texto', FINAL: '⬇️ Final tabla', INTERSECCION_FILA: '↔️ Por fila' };

  return (
    <div className={`ei-fuente-block ei-fuente-card ${expandida ? 'ei-fuente-card--open' : ''}`}>
      <div className="ei-fuente-card-header" onClick={() => setExpandida(v => !v)}>
        <div className="ei-fuente-card-left">
          <span className="ei-fuente-badge">{id}</span>
          <span className="ei-fuente-card-hoja">{config.hoja || <em style={{ color: '#bbb' }}>Sin pestaña</em>}</span>
          <span className="ei-fuente-card-modo">{modoLabel[config.modo] || config.modo}</span>
          {numCols > 0 && <span className="ei-fuente-card-cols">{numCols} col.</span>}
        </div>
        <div className="ei-fuente-card-right">
          <button className="ei-fuente-btn-eliminar" title="Eliminar"
            onClick={e => { e.stopPropagation(); onEliminar(); }}>🗑</button>
          <span className="ei-fuente-chevron">{expandida ? '▲' : '▼'}</span>
        </div>
      </div>
      {expandida && (
        <div className="ei-fuente-card-body">
          <FuenteForm config={config} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

// ─── FuenteForm ───────────────────────────────────────────────────────────────
function FuenteForm({ config, onChange }) {
  const set = (k, v) => onChange({ ...config, [k]: v });

  return (
    <div className="ei-fuente-form">
      <Field label="Pestaña del Excel">
        <input className="ei-input" value={config.hoja ?? ''} placeholder="Ej: IMCPUM"
          onChange={e => set('hoja', e.target.value)} />
      </Field>

      {/* ModoSelector reemplaza los pills anteriores */}
      <Field label="¿Cómo ubicar el dato?">
        <ModoSelector value={config.modo} onChange={(modo) => set('modo', modo)} />
      </Field>

      {/* Campos condicionales por modo */}
      {config.modo === 'INTERSECCION' && (
        <div className="ei-two-col" style={{ alignItems: 'start' }}>
          <Field label="Columna de búsqueda" hint="Letra donde está la etiqueta">
            <input className="ei-input" style={{ maxWidth: '100px' }}
              value={Array.isArray(config.columna_etiqueta) ? config.columna_etiqueta.join(', ') : (config.columna_etiqueta ?? '')}
              placeholder="Ej: A"
              onChange={e => set('columna_etiqueta', e.target.value.toUpperCase())} />
          </Field>
          <Field label="Texto a buscar" hint="Texto exacto que identifica la fila">
            <input className="ei-input" value={config.texto_buscar ?? ''} placeholder="Ej: TOTAL DE LA UNIDAD"
              onChange={e => set('texto_buscar', e.target.value)} />
          </Field>
        </div>
      )}

      {config.modo === 'FINAL' && (
        <Field label="Fila del encabezado" hint="Número de fila donde están los títulos de columna">
          <input className="ei-input" type="number" value={config.encabezado ?? ''} placeholder="Ej: 8"
            style={{ maxWidth: '120px' }} onChange={e => set('encabezado', parseInt(e.target.value) || '')} />
        </Field>
      )}

      {config.modo === 'INTERSECCION_FILA' && (
        <div className="ei-two-col" style={{ alignItems: 'start' }}>
          <Field label="Columnas de búsqueda">
            <TagsEditor
              value={Array.isArray(config.columna_etiqueta) ? config.columna_etiqueta : config.columna_etiqueta ? [config.columna_etiqueta] : []}
              onChange={v => set('columna_etiqueta', v)} placeholder="Ej: J" />
          </Field>
          <Field label="Números de fila">
            <TagsEditor
              value={(config.fila ?? []).map(String)}
              onChange={v => set('fila', v.map(Number).filter(n => !isNaN(n)))} placeholder="Ej: 65" numeric />
          </Field>
        </div>
      )}

      <Field label="Columnas a extraer" hint="Letras de las columnas con los datos que necesitas">
        <TagsEditor value={config.columna_dato ?? []} onChange={v => set('columna_dato', v)} placeholder="Ej: CQ" />
      </Field>
    </div>
  );
}

// ─── TagsEditor ───────────────────────────────────────────────────────────────
function TagsEditor({ value, onChange, placeholder = '', numeric = false }) {
  const [input, setInput] = useState('');
  const tags = Array.isArray(value) ? value : [];
  const agregar = () => {
    const v = numeric ? input.trim() : input.trim().toUpperCase();
    if (v && !tags.includes(v)) { onChange([...tags, v]); setInput(''); }
  };
  return (
    <div className="ei-tags-editor">
      <div className="ei-tags-wrap">
        {tags.length === 0 && <span style={{ fontSize: '11px', color: '#ccc', padding: '2px 4px' }}>Sin columnas aún</span>}
        {tags.map((t, i) => (
          <span key={i} className="ei-tag">{t}
            <button className="ei-tag-remove" onClick={() => onChange(tags.filter((_, idx) => idx !== i))}>×</button>
          </span>
        ))}
      </div>
      <div className="ei-tags-input-row">
        <input className="ei-input ei-input-sm" style={{ width: '100px' }} value={input} placeholder={placeholder}
          onChange={e => setInput(numeric ? e.target.value : e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && agregar()} />
        <button className="ei-btn-add" onClick={agregar}>+</button>
      </div>
    </div>
  );
}