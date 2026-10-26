"""
Motor unico de extraccion (lo usan FTP, IAAS y Extractor): dado un DataFrame YA CARGADO y el
bloque "detalle" de reporte.numerador/denominador del mapeo, valida el detalle contra el
modelo de su modoExtraccion y extrae. No le importa de donde salio el DataFrame (FTP, archivo
subido, SUI-13): cada modulo resuelve sus errores de "como llego el archivo"; aqui solo se
reportan errores de "que esta mal en el contenido".
Agregar un modo = su modelo (schemas/model/detalle_extraccion_Model.py) + su funcion
(modos_por_*_Services.py) + su entrada en EXTRACTORES y MODELOS_DETALLE.
Usado en: services/ftp/*, services/iaas/*, services/extractor/*
"""
import inspect
from typing import Any, NamedTuple

from pydantic import ValidationError

from schemas.model.detalle_extraccion_Model import (
    DetalleFiltroConteo, DetalleFiltroUnidadValor, DetalleInterseccionColumna, DetalleInterseccionFila, DetalleUltimaFila,
)
from services.compartido.extraccion.modos_por_filtro_Services import filtro_conteo, filtro_unidad_valor
from services.compartido.extraccion.modos_por_posicion_Services import interseccion_columna, interseccion_fila, ultima_fila

# Errores de CONTENIDO del Excel. Los de capa 1 (RUTA_INVALIDA, ARCHIVO_NO_ENCONTRADO,
# ARCHIVO_DUPLICADO, DESCARGA_FALLIDA, PB_JSON_ERROR) dependen de como se consiguio
# el archivo y los maneja cada modulo.
ERRORES = {
    "HOJA_NO_ENCONTRADA":     "El archivo existe pero no contiene la hoja especificada.",
    "ETIQUETA_NO_ENCONTRADA": "El texto que se buscaba como etiqueta de fila no existe en esa columna de la hoja indicada.",
    "ARCHIVO_VACIO":          "El archivo existe y la hoja fue leida, pero las celdas de datos estan vacias o no son numericas.",
    "VALOR_NULO":             "El archivo tiene datos pero alguna celda especifica esta vacia o no es numerica. Se uso 0 en su lugar.",
    "COLUMNA_NO_ENCONTRADA":  "La columna de agrupacion/condicion indicada no existe en la hoja.",
    "DETALLE_INVALIDO":       "El bloque 'detalle' del mapeo no tiene la forma que espera este modoExtraccion.",
    "MODO_DESCONOCIDO":       "El modoExtraccion no tiene una implementacion todavia.",
}

EXTRACTORES = {
    "INTERSECCION_COLUMNA":    interseccion_columna,
    "INTERSECCION_FILA":       interseccion_fila,
    "ULTIMA_FILA":             ultima_fila,
    "FILTRO_CONTEO":           filtro_conteo,
    "FILTRO_CONTEO_ACUMULADO": filtro_conteo,  # el conteo base es igual; el cruce vive aparte (ver services/extractor/conteo_con_cruce_Services.py)
    "FILTRO_UNIDAD_VALOR":     filtro_unidad_valor,
}

MODELOS_DETALLE = {
    "INTERSECCION_COLUMNA":    DetalleInterseccionColumna,
    "INTERSECCION_FILA":       DetalleInterseccionFila,
    "ULTIMA_FILA":             DetalleUltimaFila,
    "FILTRO_CONTEO":           DetalleFiltroConteo,
    "FILTRO_CONTEO_ACUMULADO": DetalleFiltroConteo,
    "FILTRO_UNIDAD_VALOR":     DetalleFiltroUnidadValor,
}


class ResultadoExtraccion(NamedTuple):
    """Lo que devuelve cada extraccion. Se sigue pudiendo desempacar como (valor, id_error, mensaje)."""
    valor:    Any
    id_error: str | None
    mensaje:  str | None


##--------------------------------------

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

    for grupo in getattr(modelo, "filtroGrupoColumnas", None) or []:
        esperadas.update(grupo.columnas)
    for alternativa in getattr(modelo, "filtroAlternativas", None) or []:
        esperadas.update({letra: cfg.nombreColumna for letra, cfg in alternativa.items() if cfg.nombreColumna})

    esperadas.update(getattr(modelo, "tomarValor", None) or {})

    return esperadas


##--------------------------------------

def extraer(df, modo_extraccion: str, detalle: dict, **kwargs) -> ResultadoExtraccion:
    """
    Punto de entrada unico de la capa 2.
    @param df               - DataFrame ya cargado (sin importar su origen)
    @param modo_extraccion  - detalle.modoExtraccion del mapeo
    @param detalle          - el bloque crudo (dict) de reporte.numerador/denominador
    @returns ResultadoExtraccion(valor, id_error, mensaje) -- se puede desempacar como tupla
    """

    funcion = EXTRACTORES.get(modo_extraccion)
    modelo  = MODELOS_DETALLE.get(modo_extraccion)

    if not funcion or not modelo:
        return ResultadoExtraccion(None, "MODO_DESCONOCIDO", f"Modo de extraccion '{modo_extraccion}' sin implementacion.")

    try:
        detalle_tipado = modelo.model_validate(detalle)
    except ValidationError as e:
        return ResultadoExtraccion(None, "DETALLE_INVALIDO", str(e))

    # cada modo solo recibe los parametros de contexto que declara (mes,
    # meses_dinamicos, nombre_unidad_buscada...) -- el llamador puede pasar
    # todos sin saber cual usa cual.
    aceptados = inspect.signature(funcion).parameters
    kwargs_modo = {k: v for k, v in kwargs.items() if k in aceptados}

    try:
        return ResultadoExtraccion(*funcion(df, detalle_tipado, **kwargs_modo))
    except (KeyError, IndexError) as e:
        return ResultadoExtraccion(None, "COLUMNA_NO_ENCONTRADA", str(e))
