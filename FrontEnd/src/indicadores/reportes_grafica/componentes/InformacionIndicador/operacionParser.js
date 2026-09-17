/**
 * operacionParser.js
 *
 * Traduce el bloque "reporte" del mapeo unificado (indicadores/mapeo/*.json)
 * a texto en lenguaje natural para la ficha técnica. Cubre los 6
 * modoExtraccion reales que existen hoy en el mapeo:
 *   INTERSECCION_COLUMNA, INTERSECCION_FILA, ULTIMA_FILA  -- fórmula algebraica
 *   FILTRO_CONTEO, FILTRO_CONTEO_ACUMULADO, FILTRO_UNIDAD_VALOR -- cuenta/filtra filas, sin fórmula
 * Ver services/indicadorMapeo_Services.py::ObtenerFichaTecnicaCompleta para
 * el lado del backend.
 */

// ── Helpers base ─────────────────────────────────────────────────────────────
// "reporte" aquí es el sub-objeto correcto ya elegido por describirFuenteCalculo:
// detalle.archivo (fuente "ftp"/"extractor" con varios códigos de archivo) o
// detalle.sexo (fuente "poblacionInfoSalud", uno o más grupos de edad).
const getConfig = (reporte, id) => reporte[id] ?? null;

const getHoja = (reporte, id) => {
  const f = reporte[id];
  if (!f) return id;
  if (Array.isArray(f)) return `Población — ${id}`; // sexo.Mujeres = ["20 a 24", ...] directo, ya no {modo, grupo, columnas}
  return f.hoja ?? id;
};

/**
 * Resuelve las columnas de datos de una fuente.
 * @param {object} reporte  - detalle.archivo o detalle.sexo
 * @param {string} id       - clave dentro de reporte (ej. "CP02", "Mujeres")
 * @param {object} [raiz]   - el indicador completo, para mapas de lookup dinámico (ej. "MESES_CIP01")
 * @param {number} [mes]    - mes 1-12 activo (para columnas dinámicas)
 */
const getCols = (reporte, id, raiz = null, mes = null) => {
  const f = reporte[id];
  if (!f) return [];

  if (Array.isArray(f)) return f; // grupo de población: la lista de edades ES las columnas

  if (f.modoExtraccion === 'ULTIMA_FILA') {
    return Array.isArray(f.columna_dato) ? f.columna_dato : [f.columna_dato];
  }

  if (f.modoExtraccion === 'INTERSECCION_FILA') {
    const columnas = Array.isArray(f.columna_dato) ? f.columna_dato : [f.columna_dato];
    const filas    = Array.isArray(f.fila) ? f.fila : [f.fila];
    const refs = [];
    for (const fila of filas) for (const col of columnas) refs.push(`${col}${fila}`);
    return refs; // ej. ["J65", "J69"]
  }

  // INTERSECCION_COLUMNA (y default): columna_dato tal cual, con soporte de lookup dinámico
  const cols = f.columna_dato ?? [];
  return cols.map(c => {
    if (/^[A-Z]{1,3}$/.test(c)) return c;
    if (raiz && raiz[c]) {
      const mapa = raiz[c];
      const clave = mes != null ? String(mes) : null;
      if (clave && mapa[clave]) return mapa[clave];
      const ejemplo = Object.entries(mapa).map(([m, col]) => `mes ${m}→${col}`).join(', ');
      return `[dinámica: ${ejemplo}]`;
    }
    return c;
  });
};

const resolverIdx = (idxStr, cols) => cols[parseInt(idxStr, 10)] ?? `[${idxStr}]`;
const resolverRng = (rngStr, cols) => {
  const [a, b] = rngStr.split(':').map(Number);
  return cols.slice(a, b);
};
const pct = (f) => `${+(parseFloat(f) * 100).toFixed(2)}%`;

// ── Descripción de extracción por modo (rama "fórmula") ────────────────────
const descripcionExtraccion = (cfg, cols) => {
  if (!cfg) return null;

  if (Array.isArray(cfg)) {
    return `Fuente local — archivo de población delegacional (Guanajuato). Grupos de edad: ${cols.length ? cols.join(', ') : 'por definir'}.`;
  }

  switch (cfg.modoExtraccion) {
    case 'INTERSECCION_COLUMNA': {
      const colStr = cols.length === 1 ? `la columna ${cols[0]}` : `las columnas ${cols.join(', ')}`;
      return `En la columna "${cfg.columna}" busca la fila "${cfg.buscar}" y extrae ${colStr}.`;
    }
    case 'INTERSECCION_FILA':
      return `Extrae por posición fija (sin búsqueda de texto): ${cols.join(', ')}. Cada referencia combina la columna de extracción con el número de fila.`;
    case 'ULTIMA_FILA':
      return `Toma el último valor con dato de la columna ${cols.join(', ')} (a partir del encabezado en la fila ${cfg.encabezado}).`;
    default:
      return `Extrae la(s) columna(s) ${cols.join(', ')}.`;
  }
};

// ── Tokenizadores (fórmulas tipo "CP02[0] + sum(CP03[0:2])") ───────────────
const splitTop = (expr, sep) => {
  const out = []; let depth = 0, buf = '';
  for (const c of expr) {
    if ('(['.includes(c)) depth++; else if (')]'.includes(c)) depth--;
    if (c === sep && depth === 0) { out.push(buf.trim()); buf = ''; }
    else buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
};

const strip = (s) => {
  s = s.trim();
  while (s[0] === '(' && s[s.length - 1] === ')') {
    let d = 0, ok = true;
    for (let i = 0; i < s.length - 1; i++) {
      if (s[i] === '(') d++; else if (s[i] === ')') d--;
      if (d === 0) { ok = false; break; }
    }
    if (ok) s = s.slice(1, -1).trim(); else break;
  }
  return s;
};

const parseRef = (tok, reporte, raiz, mes) => {
  const m = tok.match(/^(\w+)\[(\d+(?::\d+)?)\]$/);
  if (!m) return null;
  const [, id, idx] = m;
  const cols = getCols(reporte, id, raiz, mes);
  const esR = idx.includes(':');
  return { id, hoja: getHoja(reporte, id), cfg: getConfig(reporte, id), cols: esR ? resolverRng(idx, cols) : [resolverIdx(idx, cols)] };
};

const parseSum = (tok, reporte, raiz, mes) => {
  const mR = tok.match(/^sum\((\w+)\[(\d+:\d+)\]\)$/);
  if (mR) {
    const [, id, rng] = mR;
    const cols = getCols(reporte, id, raiz, mes);
    return { id, hoja: getHoja(reporte, id), cfg: getConfig(reporte, id), cols: resolverRng(rng, cols) };
  }
  const mC = tok.match(/^sum\((\w+)\)$/);
  if (mC) {
    const id = mC[1];
    return { id, hoja: getHoja(reporte, id), cfg: getConfig(reporte, id), cols: getCols(reporte, id, raiz, mes) };
  }
  return null;
};

const parseGrupoPrev = (tok, reporte, raiz, mes) => {
  const mSP = tok.match(/^sum\((\w+)\[(\d+:\d+)\]\)\s*\*\s*\(1\s*-\s*([\d.]+)\)$/);
  if (mSP) {
    const [, id, rng, p] = mSP;
    const cols = getCols(reporte, id, raiz, mes);
    return { id, hoja: getHoja(reporte, id), cfg: getConfig(reporte, id), cols: resolverRng(rng, cols), prev: p };
  }
  const mIP = tok.match(/^(\w+)\[(\d+)\]\s*\*\s*\(1\s*-\s*([\d.]+)\)$/);
  if (mIP) {
    const [, id, i, p] = mIP;
    const cols = getCols(reporte, id, raiz, mes);
    return { id, hoja: getHoja(reporte, id), cfg: getConfig(reporte, id), cols: [resolverIdx(i, cols)], prev: p };
  }
  const mCP = tok.match(/^sum\((\w+)\)\s*\*\s*\(1\s*-\s*([\d.]+)\)$/);
  if (mCP) {
    const [, id, p] = mCP;
    const cols = getCols(reporte, id, raiz, mes);
    return { id, hoja: getHoja(reporte, id), cfg: getConfig(reporte, id), cols, prev: p };
  }
  return null;
};

const parseProd = (expr, reporte, raiz, mes) => {
  const m = expr.match(/^(\w+)\[(\d+)\]\s*\*\s*\((\w+)\[(\d+)\]\s*\/\s*100\)$/);
  if (!m) return null;
  const [, f1, i1, f2, i2] = m;
  const c1 = resolverIdx(i1, getCols(reporte, f1, raiz, mes));
  const c2 = resolverIdx(i2, getCols(reporte, f2, raiz, mes));
  return {
    tipo: 'producto',
    fuentes: [
      { id: f1, hoja: getHoja(reporte, f1), cfg: getConfig(reporte, f1), grupos: [{ cols: [c1], prev: null }] },
      { id: f2, hoja: getHoja(reporte, f2), cfg: getConfig(reporte, f2), grupos: [{ cols: [c2], prev: null }] },
    ],
    operacion: `${c1} × (${c2} ÷ 100)`,
    resumen: `Multiplicación de la columna ${c1} por el porcentaje de ${c2}.`,
  };
};

const extraerListaSum = (expr) => {
  const m = expr.match(/^sum\(\[([\s\S]+)\]\)$/);
  if (!m) return null;
  return splitTop(m[1].trim(), ',');
};

const tokenAFuente = (tok, reporte, raiz, mes) => {
  const t = strip(tok);
  const gp = parseGrupoPrev(t, reporte, raiz, mes);
  if (gp) return { id: gp.id, hoja: gp.hoja, cfg: gp.cfg, cols: gp.cols, prev: gp.prev };
  const s = parseSum(t, reporte, raiz, mes);
  if (s) return { id: s.id, hoja: s.hoja, cfg: s.cfg, cols: s.cols, prev: null };
  const r = parseRef(t, reporte, raiz, mes);
  if (r) return { id: r.id, hoja: r.hoja, cfg: r.cfg, cols: r.cols, prev: null };
  return null;
};

const agruparPorFuente = (tokens, reporte, raiz, mes) => {
  const map = new Map();
  for (const tok of tokens) {
    const f = tokenAFuente(tok, reporte, raiz, mes);
    if (!f) continue;
    if (map.has(f.id)) map.get(f.id).grupos.push({ cols: f.cols, prev: f.prev });
    else map.set(f.id, { id: f.id, hoja: f.hoja, cfg: f.cfg, grupos: [{ cols: f.cols, prev: f.prev }] });
  }
  return [...map.values()];
};

const lineaOperacion = (fuentes) => {
  const bloques = fuentes.flatMap(f =>
    f.grupos.map(g => {
      const contenido = g.cols.join(' + ');
      const prevalenciaTxt = g.prev ? ` - ${pct(g.prev)}` : '';
      if (g.prev) return `(${contenido})${prevalenciaTxt}`;
      return g.cols.length > 1 ? `(${contenido})` : contenido;
    })
  );
  return bloques.join('  +  ');
};

const resumenFuentes = (fuentes) => `Datos extraídos de ${fuentes.map(f => `hoja "${f.hoja}"`).join(' y ')} para el cálculo final.`;

/** @param {string} expr  @param {object} reporte  @param {object} [raiz]  @param {number} [mes] */
export const parsearNumerador = (expr, reporte, raiz = null, mes = null) => {
  const clean = strip(expr.trim());
  const prod = parseProd(clean, reporte, raiz, mes);
  if (prod) return prod;
  const tokens = splitTop(clean, '+');
  const fuentes = agruparPorFuente(tokens, reporte, raiz, mes);
  return { tipo: 'normal', fuentes, operacion: lineaOperacion(fuentes), resumen: resumenFuentes(fuentes) };
};

export const parsearDenominador = (expr, reporte, raiz = null, mes = null) => {
  const clean = expr.trim();
  const items = extraerListaSum(clean) || splitTop(clean, '+');
  const fuentes = agruparPorFuente(items, reporte, raiz, mes);
  return { tipo: 'normal', fuentes, operacion: lineaOperacion(fuentes), resumen: resumenFuentes(fuentes) };
};

export const parsearResultado = (expr) =>
  expr.includes('* 100') ? '( Numerador ÷ Denominador ) × 100' : 'Numerador ÷ Denominador';

// ── Rama "filtro" -- FILTRO_CONTEO / FILTRO_CONTEO_ACUMULADO / FILTRO_UNIDAD_VALOR ──
// Estos no tienen fórmula que parsear (operacion.numerador/denominador es
// literal "(numerador)"/"(denominador)") -- cuentan o filtran filas directo.

const TIPO_FILTRO_TXT = {
  RANGO: (f) => `entre ${f[0]} y ${f[1]}`,
  LISTA: (f) => `uno de: ${f.join(', ')}`,
};

const descripcionFiltroColumna = (filtroColumna = {}) =>
  Object.entries(filtroColumna)
    .map(([col, cfg]) => `"${cfg.nombreColumna}" (columna ${col}) = ${TIPO_FILTRO_TXT[cfg.tipo]?.(cfg.filtro) ?? `"${cfg.filtro}"`}`)
    .join('  Y  ');

const descripcionCruce = (cruce) => {
  if (!cruce?.activa) return null;
  return `Si el diagnóstico es uno de los candidatos (${cruce.codigosCandidatos.join(', ')}), se valida cruzando con "${cruce.archivoCruce}" `
       + `por "${cruce.columnaLlave}" — si ahí aparece alguno de los códigos válidos (${cruce.codigosValidos.join(', ')}), también se cuenta.`;
};

const descripcionFiltroUnidadValor = (detalle) => {
  const [[colUnidad, cfgUnidad]] = Object.entries(detalle.columnaUnidad ?? {});
  const condiciones = descripcionFiltroColumna(detalle.filtroColumna);
  const [[colValor, nombreValor]] = Object.entries(detalle.tomarValor ?? {});
  return `Ubica la fila de la unidad (columna ${colUnidad}, "${cfgUnidad?.nombreColumna}") donde ${condiciones}, `
       + `y toma el valor de la columna ${colValor} ("${nombreValor}").`;
};

/**
 * Describe en texto una fuente de tipo "filtro" (sin fórmula algebraica).
 * @param {string} modoExtraccion
 * @param {object} detalle - el bloque crudo (reporte.numerador o .denominador)
 */
export const descripcionFiltro = (modoExtraccion, detalle) => {
  if (modoExtraccion === 'FILTRO_UNIDAD_VALOR') {
    return { hoja: detalle.hoja, condiciones: descripcionFiltroUnidadValor(detalle), cruce: null };
  }
  return {
    hoja: detalle.hoja,
    condiciones: `Cuenta las filas donde ${descripcionFiltroColumna(detalle.filtroColumna)}.`,
    cruce: modoExtraccion === 'FILTRO_CONTEO_ACUMULADO' ? descripcionCruce(detalle.cruce) : null,
  };
};

const MODOS_FILTRO = ['FILTRO_CONTEO', 'FILTRO_CONTEO_ACUMULADO', 'FILTRO_UNIDAD_VALOR'];

/**
 * Decide cómo describir un lado (numerador/denominador) de reporte.ficha,
 * según venga de la ficha técnica nueva (FuenteCalculo: {fuente, modoExtraccion, detalle}).
 * @returns {{tipo:'filtro', hoja, condiciones, cruce} | {tipo:'formula'} | {tipo:'sin_desglose', fuente}}
 */
export const describirFuenteCalculo = ({ fuente, modoExtraccion, detalle }) => {
  if (modoExtraccion && MODOS_FILTRO.includes(modoExtraccion)) {
    return { tipo: 'filtro', ...descripcionFiltro(modoExtraccion, detalle) };
  }
  // archivo.{CODE}.modoExtraccion (INTERSECCION_COLUMNA/FILTRO/ULTIMA_FILA por código)
  // o sexo.{Grupo} (población) -- ambos siguen el camino algebraico de siempre.
  if (detalle?.archivo || detalle?.sexo) {
    return { tipo: 'formula' };
  }
  // capturaWeb sin más detalle, u otra fuente sin desglose conocido.
  return { tipo: 'sin_desglose', fuente };
};

export { descripcionExtraccion, pct };
