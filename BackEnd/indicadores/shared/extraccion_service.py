"""
Servicio compartido de extraccion (capa 2): dado un DataFrame YA CARGADO y el
bloque "detalle" de reporte.numerador/denominador del mapeo unificado
(indicadores/mapeo/*.json), lee el valor segun su modoExtraccion.

No le importa de donde salio el DataFrame (FTP, archivo subido, SUI-13) --
eso lo resuelve cada modulo en su propia capa 1 (ftp_extraer.py,
iaas/services/extraccion_service.py, extractor_service.py). Ellos siguen
con sus propios errores de "como llego el archivo" (ruta invalida, archivo
corrupto, mes declarado no coincide, etc.); este servicio solo reporta
errores de "que esta mal en el contenido", con el mismo catalogo que ya
usaba ftp_extraer.py.

El "detalle" crudo del mapeo se valida contra un BaseModel por modo antes de
extraer -- si el mapeo trae un dato mal formado, se sabe de inmediato en vez
de tronar a medio pandas. Cubre los 6 modoExtraccion reales de hoy -- agregar
uno nuevo es agregar su modelo + funcion + entrada en los dos diccionarios,
no tocar el resto del archivo.

Conectado: extractor_service.py (chequeo de condiciones),
ftp/services/ftp_extraer_unificado.py e iaas/services/extraccion_unificada.py
(los caminos viejos de FTP e IAAS se conservan hasta probar con archivos reales).
"""
import inspect
import re
from typing import Any, Literal
import pandas as pd
from pydantic import BaseModel, ConfigDict, ValidationError

# Mismo catalogo que ftp/services/ftp_extraer.py, sin las entradas que son de
# capa 1 (RUTA_INVALIDA, ARCHIVO_NO_ENCONTRADO, ARCHIVO_DUPLICADO,
# DESCARGA_FALLIDA, PB_JSON_ERROR -- esas dependen de como se consiguio el
# archivo, no del contenido).
ERRORES = {
    "HOJA_NO_ENCONTRADA":     "El archivo existe pero no contiene la hoja especificada.",
    "ETIQUETA_NO_ENCONTRADA": "El texto que se buscaba como etiqueta de fila no existe en esa columna de la hoja indicada.",
    "ARCHIVO_VACIO":          "El archivo existe y la hoja fue leida, pero las celdas de datos estan vacias o no son numericas.",
    "VALOR_NULO":             "El archivo tiene datos pero alguna celda especifica esta vacia o no es numerica. Se uso 0 en su lugar.",
    "COLUMNA_NO_ENCONTRADA":  "La columna de agrupacion/condicion indicada no existe en la hoja.",
    "DETALLE_INVALIDO":       "El bloque 'detalle' del mapeo no tiene la forma que espera este modoExtraccion.",
    "MODO_DESCONOCIDO":       "El modoExtraccion no tiene una implementacion todavia.",
}


def letra_a_numero(letra: str) -> int:
    numero = 0
    for c in letra.upper():
        numero = numero * 26 + (ord(c) - ord('A') + 1)
    return numero - 1


_letra_a_numero = letra_a_numero


def _a_numero(valor):
    """Convierte una celda a float, aceptando comas de miles; None si no se puede."""
    if pd.api.types.is_number(valor) and not pd.isna(valor):
        return float(valor)
    texto = str(valor).replace(',', '').strip()
    try:
        return float(texto) if texto else 0.0
    except ValueError:
        return None


# --------------------------------------------------------------------------- #
# Modelos del "detalle" -- uno por modoExtraccion, solo con lo que cada modo
# de verdad usa (ver indicadores/mapeo/README.md).
# --------------------------------------------------------------------------- #

class CondicionFiltro(BaseModel):
    """
    Una entrada de filtroColumna/columnaUnidad. Puede venir en formato
    explicito (tipo="LISTA"/"RANGO", ver EH 03/DM 04) o en formato simple
    (solo "filtro" como texto -- match exacto, o "^prefijo" -- el que ya
    usaban IAAS 01/02-06).
    """
    model_config = ConfigDict(extra='ignore')
    filtro: Any
    tipo:          Literal['LISTA', 'RANGO'] | None = None
    nombreColumna: str | None = None


class DetalleInterseccionColumna(BaseModel):
    columna:      str
    buscar:       str
    columna_dato: list[str]


class DetalleInterseccionFila(BaseModel):
    columna_dato: list[str]
    fila:         list[int]


class DetalleUltimaFila(BaseModel):
    columna_dato: list[str]
    encabezado:   int = 0


class DetalleFiltroConteo(BaseModel):
    filtroColumna: dict[str, CondicionFiltro]
    encabezado:    int | None = None


class DetalleFiltroUnidadValor(BaseModel):
    columnaUnidad: dict[str, CondicionFiltro]
    tomarValor:    dict[str, str]
    filtroColumna: dict[str, CondicionFiltro] = {}
    encabezado:    int | None = None


# --------------------------------------------------------------------------- #
# Modos "formula" -- mismo algoritmo que ya probo ftp_extraer.py, solo se
# renombran para que coincidan con el modoExtraccion real del mapeo (antes
# "INTERSECCION"/"FINAL", ahora "INTERSECCION_COLUMNA"/"ULTIMA_FILA").
# --------------------------------------------------------------------------- #

def _interseccion_columna(
    df, detalle: DetalleInterseccionColumna,
    mes: int | str | None = None,
    meses_dinamicos: dict[str, dict[str, str]] | None = None,
):
    """
    'meses_dinamicos' cubre marcadores tipo "MESES_CIP01" (ver CUPN 01 en
    indicadores/mapeo/CUPN.json): un elemento de columna_dato puede ser, en
    vez de una letra fija, el NOMBRE de una tabla lateral del mapeo que
    resuelve la columna real segun el mes del reporte (la misma columna del
    Excel trae acumulado distinto por mes). No es especifico de CIP01 --
    cualquier indicador puede declarar su propio marcador mientras lo pase
    aqui en meses_dinamicos={"NOMBRE_MARCADOR": {"1": "D", "2": "F", ...}}.
    """
    col_etiqueta = _letra_a_numero(detalle.columna)
    texto_buscar = detalle.buscar
    letras_dato  = detalle.columna_dato

    serie = df.iloc[:, col_etiqueta].astype(str).str.replace(r'[\n\r]+', ' ', regex=True)
    filas = df[serie.str.contains(texto_buscar, na=False, case=False, regex=False)]
    if filas.empty:
        return None, "ETIQUETA_NO_ENCONTRADA", f"'{texto_buscar}' no encontrado en columna {detalle.columna}"

    fila = filas.iloc[0]
    valores = []
    for letra in letras_dato:
        if meses_dinamicos and letra in meses_dinamicos:
            if mes is None:
                return None, "VALOR_NULO", f"'{letra}' requiere el mes del reporte para resolver su columna"
            letra_real = meses_dinamicos[letra].get(str(int(mes)))
            if not letra_real:
                return None, "VALOR_NULO", f"Mes {mes} sin columna definida en '{letra}'"
            valores.append(_a_numero(fila.iloc[_letra_a_numero(letra_real)]))
        else:
            valores.append(_a_numero(fila.iloc[_letra_a_numero(letra)]))

    if all(v is None for v in valores):
        return None, "ARCHIVO_VACIO", f"Fila con '{texto_buscar}' encontrada pero celdas vacias en {letras_dato}"
    if any(v is None for v in valores):
        return valores, "VALOR_NULO", None
    return valores, None, None


def _interseccion_fila(df, detalle: DetalleInterseccionFila):
    valores = []
    for f in detalle.fila:
        idx_fila = f - 1
        for letra in detalle.columna_dato:
            idx_col = _letra_a_numero(letra)
            try:
                valores.append(_a_numero(df.iloc[idx_fila, idx_col]) or 0.0)
            except IndexError:
                valores.append(None)

    if not valores or all(v is None for v in valores):
        return None, "ARCHIVO_VACIO", f"Filas {detalle.fila} vacias o no encontradas"
    if any(v is None for v in valores):
        return valores, "VALOR_NULO", None
    return valores, None, None


def _ultima_fila(df, detalle: DetalleUltimaFila):
    indices = [_letra_a_numero(l) for l in detalle.columna_dato]
    bloque  = df.iloc[detalle.encabezado:, indices]

    valores = []
    for i in range(bloque.shape[1]):
        columna = pd.to_numeric(bloque.iloc[:, i], errors='coerce').dropna()
        valores.append(float(columna.iloc[-1]) if not columna.empty else None)

    if all(v is None for v in valores):
        return None, "ARCHIVO_VACIO", f"Sin valores numericos en {detalle.columna_dato} desde fila {detalle.encabezado + 1}"
    if any(v is None for v in valores):
        return valores, "VALOR_NULO", None
    return valores, None, None


# --------------------------------------------------------------------------- #
# Modos "filtro" -- basados en _cumple_condicion de extractor_service.py, que
# ya entiende filtroColumna con tipo LISTA/RANGO del mapeo nuevo, con
# fallback al formato simple (match exacto o "^prefijo") que ya usaba IAAS.
# --------------------------------------------------------------------------- #

def _es_vacio(valor) -> bool:
    return valor is None or (not isinstance(valor, str) and pd.isna(valor))


def _cumple_condicion(valor, cfg: CondicionFiltro) -> bool:
    if _es_vacio(valor):
        valor = None

    if cfg.tipo == 'LISTA':
        objetivo = cfg.filtro
        if valor is None:
            return False
        if isinstance(valor, (int, float)):
            return valor in objetivo or str(int(valor)) in [str(o) for o in objetivo]
        return str(valor).strip() in [str(o) for o in objetivo]

    if cfg.tipo == 'RANGO':
        if valor is None or not isinstance(valor, (int, float)) or pd.isna(valor):
            return False
        minimo, maximo = cfg.filtro
        return minimo <= valor <= maximo

    # Formato simple (solo lo usa IAAS): exacto sin distinguir mayusculas ni
    # espacios de los lados, o "^prefijo" = el texto empieza con esa palabra
    # completa ("^CIRUGIA" acepta "CIRUGIA GENERAL" pero no "CIRUGIAS").
    texto       = str(cfg.filtro)
    valor_texto = "" if valor is None else str(valor)
    if texto.startswith("^"):
        return re.match(rf'{re.escape(texto[1:])}(\s|$)', valor_texto, re.IGNORECASE) is not None
    return valor_texto.strip().upper() == texto.strip().upper()


def _fila_cumple(fila, filtro_columna: dict[str, CondicionFiltro]) -> bool:
    for letra, cfg in filtro_columna.items():
        idx = _letra_a_numero(letra)
        if idx >= len(fila) or not _cumple_condicion(fila.iloc[idx], cfg):
            return False
    return True


def _filtro_conteo(df, detalle: DetalleFiltroConteo):
    mascara = pd.Series(True, index=df.index)
    for letra, cfg in detalle.filtroColumna.items():
        idx = _letra_a_numero(letra)
        if idx >= df.shape[1]:
            return None, "COLUMNA_NO_ENCONTRADA", f"La columna {letra} no existe en la hoja"
        mascara &= df.iloc[:, idx].map(lambda v, c=cfg: _cumple_condicion(v, c)).astype(bool)
    return int(mascara.sum()), None, None


def _coincide_unidad(valor, nombre_unidad: str) -> bool:
    """
    Busca la unidad por su NUMERO (segundo token del nombre, ej. "HGZ 2 X" -> 2)
    como palabra completa -- el Excel a veces trae otra variante del nombre de
    la ciudad.
    """
    partes = nombre_unidad.split()
    return len(partes) > 1 and re.search(rf'\b{re.escape(partes[1])}\b', str(valor)) is not None


def _filtro_unidad_valor(df, detalle: DetalleFiltroUnidadValor, nombre_unidad_buscada: str | None = None):
    """
    Ubica la fila de una unidad especifica y toma un valor de otra columna.
    "UNIDADES_IAAS" en columnaUnidad.filtro es un marcador especial (ver
    mapeo/README.md): en vez de comparar contra un valor fijo, compara contra
    nombre_unidad_buscada (la unidad que se esta pidiendo en esa llamada).
    """
    col_unidad_letra, cfg_unidad = next(iter(detalle.columnaUnidad.items()))
    idx_unidad = _letra_a_numero(col_unidad_letra)
    col_valor_letra = next(iter(detalle.tomarValor))
    idx_valor  = _letra_a_numero(col_valor_letra)

    for _, fila in df.iterrows():
        valor_unidad = fila.iloc[idx_unidad]
        if cfg_unidad.filtro == "UNIDADES_IAAS":
            if nombre_unidad_buscada is None or not _coincide_unidad(valor_unidad, nombre_unidad_buscada):
                continue
        elif not _cumple_condicion(valor_unidad, cfg_unidad):
            continue
        if detalle.filtroColumna and not _fila_cumple(fila, detalle.filtroColumna):
            continue
        return _a_numero(fila.iloc[idx_valor]), None, None

    return None, "ETIQUETA_NO_ENCONTRADA", f"Unidad no encontrada en columna {col_unidad_letra}"


EXTRACTORES = {
    "INTERSECCION_COLUMNA":    _interseccion_columna,
    "INTERSECCION_FILA":       _interseccion_fila,
    "ULTIMA_FILA":             _ultima_fila,
    "FILTRO_CONTEO":           _filtro_conteo,
    "FILTRO_CONTEO_ACUMULADO": _filtro_conteo,  # el conteo base es igual; el cruce vive aparte (ver extractor_service.py)
    "FILTRO_UNIDAD_VALOR":     _filtro_unidad_valor,
}

MODELOS_DETALLE = {
    "INTERSECCION_COLUMNA":    DetalleInterseccionColumna,
    "INTERSECCION_FILA":       DetalleInterseccionFila,
    "ULTIMA_FILA":             DetalleUltimaFila,
    "FILTRO_CONTEO":           DetalleFiltroConteo,
    "FILTRO_CONTEO_ACUMULADO": DetalleFiltroConteo,
    "FILTRO_UNIDAD_VALOR":     DetalleFiltroUnidadValor,
}


def columnas_esperadas(modo_extraccion: str, detalle: dict) -> dict[str, str]:
    """
    {letra: nombre del encabezado} que el detalle espera encontrar en el Excel
    (nombreColumna de filtroColumna/columnaUnidad y los nombres de tomarValor)
    -- para validar que el archivo subido sea el correcto antes de extraer.
    Los modos "formula" no declaran nombres, asi que regresan {}.
    """
    modelo = MODELOS_DETALLE[modo_extraccion].model_validate(detalle)
    esperadas: dict[str, str] = {}
    for bloque in ("columnaUnidad", "filtroColumna"):
        for letra, cfg in (getattr(modelo, bloque, None) or {}).items():
            if cfg.nombreColumna:
                esperadas[letra] = cfg.nombreColumna
    esperadas.update(getattr(modelo, "tomarValor", None) or {})
    return esperadas


def extraer(df, modo_extraccion: str, detalle: dict, **kwargs):
    """
    Punto de entrada unico de la capa 2.
    @param df               - DataFrame ya cargado (sin importar su origen)
    @param modo_extraccion  - detalle.modoExtraccion del mapeo
    @param detalle          - el bloque crudo (dict) de reporte.numerador/denominador
    @returns (valor, id_error, mensaje_error) -- mismo contrato que ya usaba ftp_extraer.py
    """
    funcion = EXTRACTORES.get(modo_extraccion)
    modelo  = MODELOS_DETALLE.get(modo_extraccion)
    if not funcion or not modelo:
        return None, "MODO_DESCONOCIDO", f"Modo de extraccion '{modo_extraccion}' sin implementacion."

    try:
        detalle_tipado = modelo.model_validate(detalle)
    except ValidationError as e:
        return None, "DETALLE_INVALIDO", str(e)

    # cada modo solo recibe los parametros de contexto que declara (mes,
    # meses_dinamicos, nombre_unidad_buscada...) -- el llamador puede pasar
    # todos sin saber cual usa cual.
    aceptados = inspect.signature(funcion).parameters
    kwargs_modo = {k: v for k, v in kwargs.items() if k in aceptados}

    try:
        return funcion(df, detalle_tipado, **kwargs_modo)
    except (KeyError, IndexError) as e:
        return None, "COLUMNA_NO_ENCONTRADA", str(e)
