/**
 * operacionParser.ts
 *
 * Traduce el bloque "reporte" del mapeo unificado (indicadores/mapeo/*.json)
 * a texto en lenguaje natural para la ficha técnica. Cubre los 6
 * modoExtraccion reales que existen hoy en el mapeo:
 *   INTERSECCION_COLUMNA, INTERSECCION_FILA, ULTIMA_FILA  -- fórmula algebraica
 *   FILTRO_CONTEO, FILTRO_CONTEO_ACUMULADO, FILTRO_UNIDAD_VALOR -- cuenta/filtra filas, sin fórmula
 * Ver BackEnd/indicadores/services/informacion/ficha_indicador_Services.py::obtener_ficha_tecnica_completa para
 * el lado del backend.
 */

// propios
import type { CondicionColumna, ConfigArchivo, ConfigsFuente, CruceArchivo, DetalleFuente, FuenteCalculo, GrupoColumnas } from '@/types/api/indicadores/informacion';
import type { CalculoParseado, ConfigFuente, DescripcionFiltro, FuenteAgrupada, FuenteDescrita, Segmento } from '@/types/pantallas/fichaTecnica';

/** Mapas de columnas que cambian por mes ({"MESES_CIP01": {"1": "D", ...}}). */
type ColumnasPorMes = Record<string, Record<string, string>>;

interface FuenteToken {
  id: string;
  hoja: string;
  cfg: ConfigFuente | null;
  cols: string[];
  prev: string | null;
}

const comoLista = <T,>(valor: T | T[] | undefined): T[] =>
  valor == null ? [] : Array.isArray(valor) ? valor : [valor];

// ── Helpers base ─────────────────────────────────────────────────────────────
// "reporte" aquí es el sub-objeto correcto ya elegido por describirFuenteCalculo:
// detalle.archivo (fuente "ftp"/"extractor" con varios códigos de archivo) o
// detalle.sexo (fuente "poblacionInfoSalud", uno o más grupos de edad).
const getConfig = (reporte: ConfigsFuente, id: string): ConfigFuente | null => reporte[id] ?? null;

const getHoja = (reporte: ConfigsFuente, id: string): string => {
  const f = reporte[id];
  if (!f) return id;
  if (Array.isArray(f)) return `Población — ${id}`; // sexo.Mujeres = ["20 a 24", ...] directo, ya no {modo, grupo, columnas}
  return f.hoja ?? id;
};

const MESES_ABREV = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Columna que cambia segun el mes ({"1": "C", ..., "7": "R"}): junta los meses
// seguidos que usan la misma columna -> "Ene–Jun: C · Jul–Dic: R".
const describirColumnasPorMes = (mapa: Record<string, string>): string => {
  const tramos: { col: string; desde: number; hasta: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const col = mapa[String(m)];
    if (!col) continue;
    const ultimo = tramos[tramos.length - 1];
    if (ultimo && ultimo.col === col && ultimo.hasta === m - 1) ultimo.hasta = m;
    else tramos.push({ col, desde: m, hasta: m });
  }
  return tramos
    .map(t => `${MESES_ABREV[t.desde - 1]}${t.hasta > t.desde ? `–${MESES_ABREV[t.hasta - 1]}` : ''}: ${t.col}`)
    .join(' · ');
};

/**
 * Resuelve las columnas de datos de una fuente.
 * @param {object} reporte  - detalle.archivo o detalle.sexo
 * @param {string} id       - clave dentro de reporte (ej. "CP02", "Mujeres")
 * @param {object} [raiz]   - el indicador completo, para mapas de lookup dinámico (ej. "MESES_CIP01")
 * @param {number} [mes]    - mes 1-12 activo (para columnas dinámicas)
 */
const getCols = (reporte: ConfigsFuente, id: string, raiz: ColumnasPorMes | null = null, mes: number | null = null): string[] => {
  const f = reporte[id];
  if (!f) return [];

  if (Array.isArray(f)) return f; // grupo de población: la lista de edades ES las columnas

  if (f.modoExtraccion === 'ULTIMA_FILA') {
    return comoLista(f.columna_dato);
  }

  if (f.modoExtraccion === 'INTERSECCION_FILA') {
    const columnas = comoLista(f.columna_dato);
    const filas    = comoLista(f.fila);
    const refs: string[] = [];
    for (const fila of filas) for (const col of columnas) refs.push(`${col}${fila}`);
    return refs; // ej. ["J65", "J69"]
  }

  // INTERSECCION_COLUMNA (y default): columna_dato tal cual, con soporte de lookup dinámico
  const cols = comoLista(f.columna_dato);
  return cols.map(c => {
    if (/^[A-Z]{1,3}$/.test(c)) return c;
    if (raiz && raiz[c]) {
      const mapa = raiz[c];
      const clave = mes != null ? String(mes) : null;
      if (clave && mapa[clave]) return mapa[clave];
      return describirColumnasPorMes(mapa);
    }
    return c;
  });
};

const resolverIdx = (idxStr: string, cols: string[]): string => cols[parseInt(idxStr, 10)] ?? `[${idxStr}]`;
const resolverRng = (rngStr: string, cols: string[]): string[] => {
  const [a, b] = rngStr.split(':').map(Number);
  return cols.slice(a, b);
};
const pct = (f: string | number): string => `${+(parseFloat(String(f)) * 100).toFixed(2)}%`;

// ── Descripción de extracción por modo (rama "fórmula") ────────────────────
// Un descriptor por cada modoExtraccion real -- agregar un modo nuevo es
// agregar una entrada aquí, no tocar la función de abajo.
const DESCRIPTORES_FORMULA: Record<string, (cfg: ConfigArchivo, cols: string[]) => string> = {
  INTERSECCION_COLUMNA: (cfg, cols) => {
    const colStr = cols.length === 1 ? `la columna ${cols[0]}` : `las columnas ${cols.join(', ')}`;
    return `En la columna "${cfg.columna}" busca la fila "${cfg.buscar}" y extrae ${colStr}.`;
  },
  INTERSECCION_FILA: (_cfg, cols) =>
    `Extrae por posición fija (sin búsqueda de texto): ${cols.join(', ')}. Cada referencia combina la columna de extracción con el número de fila.`,
  ULTIMA_FILA: (cfg, cols) =>
    `Toma el último valor con dato de la columna ${cols.join(', ')} (a partir del encabezado en la fila ${cfg.encabezado}).`,
};

const descripcionExtraccion = (cfg: ConfigFuente | null, cols: string[]): string | null => {
  if (!cfg) return null;

  if (Array.isArray(cfg)) {
    return `Fuente local — archivo de población delegacional (Guanajuato). Grupos de edad: ${cols.length ? cols.join(', ') : 'por definir'}.`;
  }

  const descriptor = cfg.modoExtraccion ? DESCRIPTORES_FORMULA[cfg.modoExtraccion] : undefined;
  return descriptor
    ? descriptor(cfg, cols)
    : `Extrae la(s) columna(s) ${cols.join(', ')} (modo "${cfg.modoExtraccion}" sin descripción todavía).`;
};

// ── Tokenizadores (fórmulas tipo "CP02[0] + sum(CP03[0:2])") ───────────────
const splitTop = (expr: string, sep: string): string[] => {
  const out: string[] = []; let depth = 0, buf = '';
  for (const c of expr) {
    if ('(['.includes(c)) depth++; else if (')]'.includes(c)) depth--;
    if (c === sep && depth === 0) { out.push(buf.trim()); buf = ''; }
    else buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
};

const strip = (s: string): string => {
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

const parseRef = (tok: string, reporte: ConfigsFuente, raiz: ColumnasPorMes | null, mes: number | null): FuenteToken | null => {
  const m = tok.match(/^(\w+)\[(\d+(?::\d+)?)\]$/);
  if (!m) return null;
  const [, id, idx] = m;
  const cols = getCols(reporte, id, raiz, mes);
  const esR = idx.includes(':');
  return { id, hoja: getHoja(reporte, id), cfg: getConfig(reporte, id), cols: esR ? resolverRng(idx, cols) : [resolverIdx(idx, cols)], prev: null };
};

const parseSum = (tok: string, reporte: ConfigsFuente, raiz: ColumnasPorMes | null, mes: number | null): FuenteToken | null => {
  const mR = tok.match(/^sum\((\w+)\[(\d+:\d+)\]\)$/);
  if (mR) {
    const [, id, rng] = mR;
    const cols = getCols(reporte, id, raiz, mes);
    return { id, hoja: getHoja(reporte, id), cfg: getConfig(reporte, id), cols: resolverRng(rng, cols), prev: null };
  }
  const mC = tok.match(/^sum\((\w+)\)$/);
  if (mC) {
    const id = mC[1];
    return { id, hoja: getHoja(reporte, id), cfg: getConfig(reporte, id), cols: getCols(reporte, id, raiz, mes), prev: null };
  }
  return null;
};

const parseGrupoPrev = (tok: string, reporte: ConfigsFuente, raiz: ColumnasPorMes | null, mes: number | null): FuenteToken | null => {
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

const parseProd = (expr: string, reporte: ConfigsFuente, raiz: ColumnasPorMes | null, mes: number | null): CalculoParseado | null => {
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

const extraerListaSum = (expr: string): string[] | null => {
  const m = expr.match(/^sum\(\[([\s\S]+)\]\)$/);
  if (!m) return null;
  return splitTop(m[1].trim(), ',');
};

// El redondeo por grupo (ej. DM 01: "math.floor(PB02[0] * (1 - 0.029) + 0.5)") no cambia
// de dónde sale el dato -- se quita para describir solo el grupo y su prevalencia.
const sinRedondeo = (tok: string): string => {
  const m = strip(tok).match(/^(?:math\.floor|round)\(([\s\S]+?)(?:\s*\+\s*0\.5)?\)$/);
  return m ? m[1] : tok;
};

const tokenAFuente = (tok: string, reporte: ConfigsFuente, raiz: ColumnasPorMes | null, mes: number | null): FuenteToken | null => {
  const t = strip(sinRedondeo(tok));
  return parseGrupoPrev(t, reporte, raiz, mes) ?? parseSum(t, reporte, raiz, mes) ?? parseRef(t, reporte, raiz, mes);
};

const agruparPorFuente = (tokens: string[], reporte: ConfigsFuente, raiz: ColumnasPorMes | null, mes: number | null): FuenteAgrupada[] => {
  const map = new Map<string, FuenteAgrupada>();
  for (const tok of tokens) {
    const f = tokenAFuente(tok, reporte, raiz, mes);
    if (!f) continue;
    const existente = map.get(f.id);
    if (existente) existente.grupos.push({ cols: f.cols, prev: f.prev });
    else map.set(f.id, { id: f.id, hoja: f.hoja, cfg: f.cfg, grupos: [{ cols: f.cols, prev: f.prev }] });
  }
  return [...map.values()];
};

const lineaOperacion = (fuentes: FuenteAgrupada[]): string => {
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

const resumenFuentes = (fuentes: FuenteAgrupada[]): string => `Datos extraídos de ${fuentes.map(f => `hoja "${f.hoja}"`).join(' y ')} para el cálculo final.`;

export const parsearNumerador = (expr: string, reporte: ConfigsFuente, raiz: ColumnasPorMes | null = null, mes: number | null = null): CalculoParseado => {
  const clean = strip(expr.trim());
  const prod = parseProd(clean, reporte, raiz, mes);
  if (prod) return prod;
  const tokens = splitTop(clean, '+');
  const fuentes = agruparPorFuente(tokens, reporte, raiz, mes);
  return { tipo: 'normal', fuentes, operacion: lineaOperacion(fuentes), resumen: resumenFuentes(fuentes) };
};

export const parsearDenominador = (expr: string, reporte: ConfigsFuente, raiz: ColumnasPorMes | null = null, mes: number | null = null): CalculoParseado => {
  const clean = expr.trim();
  const items = extraerListaSum(clean) || splitTop(clean, '+');
  const fuentes = agruparPorFuente(items, reporte, raiz, mes);
  return { tipo: 'normal', fuentes, operacion: lineaOperacion(fuentes), resumen: resumenFuentes(fuentes) };
};

export const parsearResultado = (expr: string): string =>
  expr.includes('* 100') ? '( Numerador ÷ Denominador ) × 100' : 'Numerador ÷ Denominador';

// ── Rama "filtro" -- FILTRO_CONTEO / FILTRO_CONTEO_ACUMULADO / FILTRO_UNIDAD_VALOR ──
// Estos no tienen fórmula que parsear (operacion.numerador/denominador es
// literal "(numerador)"/"(denominador)") -- cuentan o filtran filas directo.

// Un "segmento" de descripción es texto plano (string) o un grupo de códigos
// ({ codigos: [...] }) -- el front decide cómo pintar cada uno (texto vs.
// chips), aquí solo se arma el contenido, nunca el markup.
const descripcionCondicion = (col: string, cfg: CondicionColumna): Segmento[] => {
  const base = `"${cfg.nombreColumna}" (columna ${col}) `;
  const lista = comoLista(cfg.filtro);
  if (cfg.tipo === 'LISTA')   return [`${base}= uno de: `, { codigos: lista }];
  if (cfg.tipo === 'RANGO')   return [`${base}= entre ${lista[0]} y ${lista[1]}`];
  if (cfg.tipo === 'PREFIJO') return [`${base}empieza con: `, { codigos: lista }];
  if (cfg.tipo === 'SUFIJO')  return [`${base}termina con: `, { codigos: lista }];
  return [`${base}= "${cfg.filtro}"`];
};

const segmentosFiltroColumna = (filtroColumna: Record<string, CondicionColumna> = {}): Segmento[] => {
  const segmentos: Segmento[] = [];
  Object.entries(filtroColumna).forEach(([col, cfg], i) => {
    if (i > 0) segmentos.push('  Y  ');
    segmentos.push(...descripcionCondicion(col, cfg));
  });
  return segmentos;
};

// filtroGrupoColumnas: una misma condición revisada en varias columnas a la vez
// (ej. diagnóstico principal o secundarios) -- CUALQUIERA = basta una, NINGUNA = ninguna.
const ACCION_GRUPO: Record<string, string> = { LISTA: 'es', PREFIJO: 'empieza con', SUFIJO: 'termina con', RANGO: 'está' };

const segmentosGrupoColumnas = (grupo: GrupoColumnas): Segmento[] => {
  const columnas = Object.entries(grupo.columnas).map(([col, nombre]) => `"${nombre}" (${col})`);
  const accion = ACCION_GRUPO[grupo.tipo] ?? 'cumple';
  const ninguna = grupo.coincidencia === 'NINGUNA';
  const sujeto = columnas.length === 1
    ? `${columnas[0]} ${ninguna ? 'no ' : ''}${accion}`
    : `${ninguna ? 'ninguna' : 'alguna'} de las columnas ${columnas.join(', ')} ${accion}`;
  if (grupo.tipo === 'RANGO') return [`${sujeto} entre ${grupo.filtro[0]} y ${grupo.filtro[1]}`];
  return [`${sujeto} uno de: `, { codigos: grupo.filtro }];
};

// filtroAlternativas: varias combinaciones de columnas; la fila cuenta si cumple al menos una.
const segmentosAlternativas = (alternativas: Record<string, CondicionColumna>[]): Segmento[] => {
  const segmentos: Segmento[] = ['cumple alguna de estas opciones: '];
  alternativas.forEach((alternativa, i) => {
    if (i > 0) segmentos.push('  O  ');
    segmentos.push(`(opción ${i + 1}) `, ...segmentosFiltroColumna(alternativa));
  });
  return segmentos;
};

// Junta todas las condiciones que puede traer un FILTRO_CONTEO (todas deben cumplirse).
const segmentosCondiciones = (detalle: DetalleFuente): Segmento[] => {
  const bloques: Segmento[][] = [];
  if (Object.keys(detalle.filtroColumna ?? {}).length) bloques.push(segmentosFiltroColumna(detalle.filtroColumna));
  (detalle.filtroGrupoColumnas ?? []).forEach(grupo => bloques.push(segmentosGrupoColumnas(grupo)));
  if (detalle.filtroAlternativas?.length) bloques.push(segmentosAlternativas(detalle.filtroAlternativas));
  return bloques.flatMap((bloque, i): Segmento[] => (i > 0 ? ['  Y  ', ...bloque] : bloque));
};

const descripcionCruce = (cruce: CruceArchivo | undefined): Segmento[] | null => {
  if (!cruce?.activa) return null;
  return [
    'Si el diagnóstico es uno de los candidatos (', { codigos: cruce.codigosCandidatos },
    `), se valida cruzando con "${cruce.archivoCruce}" por "${cruce.columnaLlave}" — si ahí aparece alguno de los códigos válidos (`,
    { codigos: cruce.codigosValidos }, '), también se cuenta.',
  ];
};

const descripcionFiltroUnidadValor = (detalle: DetalleFuente): Segmento[] => {
  const [colUnidad, cfgUnidad] = Object.entries(detalle.columnaUnidad ?? {})[0] ?? [];
  const [colValor, nombreValor] = Object.entries(detalle.tomarValor ?? {})[0] ?? [];
  return [
    `Ubica la fila de la unidad (columna ${colUnidad}, "${cfgUnidad?.nombreColumna}") donde `,
    ...segmentosFiltroColumna(detalle.filtroColumna),
    `, y toma el valor de la columna ${colValor} ("${nombreValor}").`,
  ];
};

// Un descriptor por cada modoExtraccion de tipo "filtro" -- cada uno devuelve
// { condiciones, cruce }; agregar un modo nuevo es agregar una entrada aquí.
const DESCRIPTORES_FILTRO: Record<string, (detalle: DetalleFuente) => Omit<DescripcionFiltro, 'hoja'>> = {
  FILTRO_CONTEO: (detalle) => ({
    condiciones: ['Cuenta las filas donde ', ...segmentosCondiciones(detalle), '.'],
    cruce: null,
  }),
  FILTRO_CONTEO_ACUMULADO: (detalle) => ({
    condiciones: ['Cuenta las filas donde ', ...segmentosCondiciones(detalle), '.'],
    cruce: descripcionCruce(detalle.cruce),
  }),
  FILTRO_UNIDAD_VALOR: (detalle) => ({
    condiciones: descripcionFiltroUnidadValor(detalle),
    cruce: null,
  }),
};

/**
 * Describe una fuente de tipo "filtro" (sin fórmula algebraica) como una
 * lista de segmentos (string = texto plano, {codigos} = lista para mostrar
 * como chips) -- nunca un string ya armado, para que el front pueda pintar
 * los códigos (de diagnóstico, columna, etc.) distinto del resto del texto.
 * @param {string} modoExtraccion
 * @param {object} detalle - el bloque crudo (reporte.numerador o .denominador)
 */
const descripcionFiltro = (modoExtraccion: string, detalle: DetalleFuente): DescripcionFiltro => {
  const descriptor = DESCRIPTORES_FILTRO[modoExtraccion];
  const partes = descriptor
    ? descriptor(detalle)
    : { condiciones: [`Modo de extracción "${modoExtraccion}" sin descripción todavía.`], cruce: null };
  return { hoja: detalle.hoja ?? detalle.nombreArchivo, ...partes };
};

const MODOS_FILTRO: string[] = ['FILTRO_CONTEO', 'FILTRO_CONTEO_ACUMULADO', 'FILTRO_UNIDAD_VALOR'];

/**
 * Decide cómo describir un lado (numerador/denominador) de reporte.ficha,
 * según venga de la ficha técnica nueva (FuenteCalculo: {fuente, modoExtraccion, detalle}).
 */
export const describirFuenteCalculo = ({ fuente, modoExtraccion, detalle }: FuenteCalculo): FuenteDescrita => {
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
