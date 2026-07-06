export const uid = () => Math.random().toString(36).slice(2);

export const FUENTE_VACIA = {
  hoja: '', modo: 'INTERSECCION', columna_etiqueta: '', texto_buscar: '', columna_dato: [],
};

export const getChips = (reporte) => {
  const chips = [];
  Object.entries(reporte || {}).forEach(([fId, cfg]) => {
    (cfg.columna_dato || []).forEach((col, idx) => {
      chips.push({ key: `${fId}:${idx}`, fId, col, idx });
    });
  });
  return chips;
};

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

export const buildNumerador = (terminos) => {
  const exprs = terminos.map(t => colsToExpr(t.cols)).filter(Boolean);
  return exprs.length > 0 ? exprs.join(' + ') : '—';
};

export const buildDenominador = (grupos) => {
  const exprs = grupos.map(grupoToExpr).filter(Boolean);
  if (exprs.length === 0) return '—';
  if (exprs.length === 1) return exprs[0];
  return `sum([${exprs.join(', ')}])`;
};

export const buildResultado = (tipo) =>
  tipo === 'porcentaje'
    ? 'round((numerador / denominador) * 100, 2)'
    : 'round((numerador / denominador), 2)';

export const buildOperacion = (b) => ({
  numerador:   buildNumerador(b.numeradorTerminos).replace('—', ''),
  denominador: buildDenominador(b.denominadorGrupos).replace('—', ''),
  resultado:   buildResultado(b.resultado),
});
