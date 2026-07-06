import { useState } from 'react';
import { Field } from './Field';
import ModoSelector from './metodos';

export function TagsEditor({ value, onChange, placeholder = '', numeric = false }) {
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

export function FuenteForm({ config, onChange }) {
  const set = (k, v) => onChange({ ...config, [k]: v });
  return (
    <div className="ei-fuente-form">
      <Field label="Pestaña del Excel">
        <input className="ei-input" value={config.hoja ?? ''} placeholder="Ej: IMCPUM"
          onChange={e => set('hoja', e.target.value)} />
      </Field>
      <Field label="¿Cómo ubicar el dato?">
        <ModoSelector value={config.modo} onChange={(modo) => set('modo', modo)} />
      </Field>
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

export function FuenteCard({ id, config, onChange, onEliminar }) {
  const [expandida, setExpandida] = useState(false);
  const numCols   = config.columna_dato?.length ?? 0;
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
