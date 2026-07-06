/**
 * operacionParser.js
 */

// ── Helpers base ─────────────────────────────────────────────────────────────
const getConfig = (reporte, id) => reporte[id] ?? null;
const getHoja   = (reporte, id) => {
  const f = reporte[id];
  if (!f) return id;
  if (f.modo === 'JSON_POBLACION') return `Población ${f.grupo ?? ''}`;
  return f.hoja ?? id;
};

/**
 * Resuelve las columnas de datos de una fuente.
 * Maneja el caso especial donde columna_dato contiene claves de lookup dinámico
 * (ej. "MESES_CIP01"), resolviéndolas contra el mapa definido en el indicador raíz.
 *
 * @param {object} reporte  - El objeto "reporte" del indicador
 * @param {string} id       - Clave de la fuente (ej. "CIP01")
 * @param {object} [raiz]   - El objeto indicador completo, para buscar mapas de lookup
 * @param {number} [mes]    - Número de mes 1-12 (para resolver columnas dinámicas)
 */
const getCols = (reporte, id, raiz = null, mes = null) => {
  const f = reporte[id];
  if (!f) return [];

  // Para FINAL: las columnas de extracción vienen en columna_etiqueta (ej. ["F", "G"])
  // Se toma el último valor numérico de cada una — igual que INTERSECCION en cuanto a nombres
  if (f.modo === 'FINAL') {
    return Array.isArray(f.columna_etiqueta) ? f.columna_etiqueta : [f.columna_etiqueta];
  }

  // Para INTERSECCION_FILA: columna_etiqueta = columna(s), fila = números de fila
  // Se combinan para producir referencias tipo "J65", "J69"
  if (f.modo === 'INTERSECCION_FILA') {
    const columnas = Array.isArray(f.columna_etiqueta) ? f.columna_etiqueta : [f.columna_etiqueta];
    const filas    = Array.isArray(f.fila) ? f.fila : [f.fila];
    // Producto: cada columna con cada fila, en el orden que vienen
    const refs = [];
    for (const fila of filas) {
      for (const col of columnas) {
        refs.push(`${col}${fila}`);
      }
    }
    return refs; // ej. ["J65", "J69"]
  }

  if (f.modo === 'JSON_POBLACION') return f.columnas ?? [];

  const cols = f.columna_dato ?? [];

  // Resuelve referencias a mapas de lookup dinámico (ej. "MESES_CIP01")
  return cols.map(c => {
    if (/^[A-Z]{1,3}$/.test(c)) return c; // columna normal (A, BQ, etc.)
    // Es una clave de lookup → buscarla en el indicador raíz
    if (raiz && raiz[c]) {
      const mapa = raiz[c];
      const clave = mes != null ? String(mes) : null;
      if (clave && mapa[clave]) return mapa[clave]; // columna resuelta según mes
      // Si no hay mes, devolvemos una representación legible del mapa
      const ejemplo = Object.entries(mapa)
        .map(([m, col]) => `mes ${m}→${col}`)
        .join(', ');
      return `[dinámica: ${ejemplo}]`;
    }
    return c; // fallback: devolver tal cual
  });
};

const resolverIdx = (idxStr, cols) => cols[parseInt(idxStr, 10)] ?? `[${idxStr}]`;
const resolverRng = (rngStr, cols) => {
  const [a, b] = rngStr.split(':').map(Number);
  return cols.slice(a, b);
};
const pct = (f) => `${+(parseFloat(f) * 100).toFixed(2)}%`;

// ── Descripción de extracción por modo ───────────────────────────────────────
/**
 * @param {object} cfg      - Configuración de la fuente
 * @param {string[]} cols   - Columnas ya resueltas
 * @param {object} [raiz]   - Indicador raíz (para enriquecer descripción dinámica)
 * @param {number} [mes]    - Mes activo (para descripción dinámica)
 */
const descripcionExtraccion = (cfg, cols, _raiz = null, mes = null) => {
  if (!cfg) return null;

  switch (cfg.modo) {
    case 'JSON_POBLACION': {
      const grupo   = cfg.grupo ?? 'Todos';
      const edades  = cols.length ? cols.join(', ') : 'por definir';
      return `Fuente local — archivo de población delegacional (Guanajuato). Grupo: ${grupo}. Grupos de edad: ${edades}.`;
    }

    case 'INTERSECCION': {
      const etiq = Array.isArray(cfg.columna_etiqueta)
        ? cfg.columna_etiqueta.join(', ')
        : cfg.columna_etiqueta;
      const colStr = cols.length === 1
        ? `la columna ${cols[0]}`
        : `las columnas ${cols.join(', ')}`;

      // Detectar si alguna columna es dinámica (viene de un mapa de mes)
      const hasDinamica = (cfg.columna_dato ?? []).some(
        c => !/^[A-Z]{1,3}$/.test(c)
      );
      const sufijoDinamico = hasDinamica
        ? mes != null
          ? ` (columna del mes ${mes} según tabla de meses)`
          : ` (columna variable según el mes del reporte)`
        : '';

      return `En la columna "${etiq}" busca la fila "${cfg.texto_buscar}" y extrae ${colStr}${sufijoDinamico}.`;
    }

    case 'INTERSECCION_FILA': {
      // cols ya contiene referencias combinadas: ["J65", "J69"]
      // cols[0] → numerador, cols[1] → denominador (según índice en la expresión)
      const refsStr = cols.join(', ');
      return `Extrae por posición fija (sin búsqueda de texto): ${refsStr}. `
           + `Cada referencia combina la columna de extracción con el número de fila.`;
    }

    case 'FINAL': {
      const colStr = cols.length === 1
        ? `la columna ${cols[0]}`
        : `las columnas ${cols.join(', ')}`;
      return `Tomar el ultimo valor numerico de la "${colStr}".`;
    }

    default: {
      const colStr = cols.join(', ');
      return `Extrae la(s) columna(s) ${colStr}.`;
    }
  }
};

// ── Tokenizadores ─────────────────────────────────────────────────────────────
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

// ── Parsers de token ──────────────────────────────────────────────────────────
const parseRef = (tok, reporte, raiz, mes) => {
  const m = tok.match(/^(\w+)\[(\d+(?::\d+)?)\]$/);
  if (!m) return null;
  const [, id, idx] = m;
  const cols = getCols(reporte, id, raiz, mes);
  const esR = idx.includes(':');
  return {
    id,
    hoja: getHoja(reporte, id),
    cfg: getConfig(reporte, id),
    cols: esR ? resolverRng(idx, cols) : [resolverIdx(idx, cols)],
  };
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

// ── Agrupación y Línea de Operación ──────────────────────────────────────────

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
    if (map.has(f.id)) {
      map.get(f.id).grupos.push({ cols: f.cols, prev: f.prev });
    } else {
      map.set(f.id, { id: f.id, hoja: f.hoja, cfg: f.cfg, grupos: [{ cols: f.cols, prev: f.prev }] });
    }
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

const resumenFuentes = (fuentes) => {
  const nombres = fuentes.map(f => `hoja "${f.hoja}"`).join(' y ');
  return `Datos extraídos de ${nombres} para el cálculo final.`;
};

// ── EXPORTS ───────────────────────────────────────────────────────────────────

/**
 * @param {string} expr
 * @param {object} reporte
 * @param {object} [raiz]   - Indicador completo (para mapas de lookup como MESES_CIP01)
 * @param {number} [mes]    - Mes 1-12 activo
 */
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

export { descripcionExtraccion, pct };