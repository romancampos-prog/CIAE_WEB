import { useState, useMemo } from 'react';
import { Field } from './Field';
import ModoSelector from './metodos';
import { FuenteCard, FuenteForm } from './FuenteCard';
import { TerminoCard, GrupoCard } from './BuilderCards';
import {
  uid, FUENTE_VACIA, getChips,
  buildNumerador, buildDenominador, buildResultado, buildOperacion,
} from './operacionUtils';

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

  // Numerador
  const addTermino  = ()       => sync({ ...builder, numeradorTerminos: [...builder.numeradorTerminos, { _id: uid(), fuenteId: '', cols: [] }] });
  const delTermino  = (i)      => sync({ ...builder, numeradorTerminos: builder.numeradorTerminos.filter((_, idx) => idx !== i) });
  const updTermino  = (i, p)   => sync({ ...builder, numeradorTerminos: builder.numeradorTerminos.map((t, idx) => idx === i ? { ...t, ...p } : t) });
  const addColNum   = (i, key) => { if (!builder.numeradorTerminos[i].cols.includes(key)) updTermino(i, { cols: [...builder.numeradorTerminos[i].cols, key] }); setPickerNum(null); };
  const delColNum   = (i, key) => updTermino(i, { cols: builder.numeradorTerminos[i].cols.filter(k => k !== key) });

  // Denominador
  const addGrupo    = ()       => sync({ ...builder, denominadorGrupos: [...builder.denominadorGrupos, { _id: uid(), cols: [], usaPrevalencia: false, pct: '' }] });
  const delGrupo    = (i)      => sync({ ...builder, denominadorGrupos: builder.denominadorGrupos.filter((_, idx) => idx !== i) });
  const updGrupo    = (i, p)   => sync({ ...builder, denominadorGrupos: builder.denominadorGrupos.map((g, idx) => idx === i ? { ...g, ...p } : g) });
  const addColGrupo = (i, key) => { if (!builder.denominadorGrupos[i].cols.includes(key)) updGrupo(i, { cols: [...builder.denominadorGrupos[i].cols, key] }); setPickerDen(null); };
  const delColGrupo = (i, key) => updGrupo(i, { cols: builder.denominadorGrupos[i].cols.filter(k => k !== key) });

  // Fuentes
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
            <div className="ei-builder">

              {/* Tipo de resultado */}
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

              {/* Numerador */}
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

              {/* Denominador */}
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
                    onUpdate={(p)  => updGrupo(i, p)}
                    onEliminar={()  => delGrupo(i)}
                    mostrarEliminar={builder.denominadorGrupos.length > 1}
                  />
                ))}
                <button className="ei-btn-add-termino" onClick={addGrupo}>+ Nuevo grupo</button>
              </div>

              {/* Preview fórmula */}
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
