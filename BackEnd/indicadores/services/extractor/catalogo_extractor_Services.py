"""
Lo que el mapeo dice de los indicadores del Extractor: cuales son, cuales van por corte, que
archivos usa cada uno, si llevan cruce con Egresos y si se reportan en otro mes que el del
archivo (desfase).
Usado en: services/extractor/*, services/compartido/reporte_guardado_Services.py, services/grafica/*, services/excel/*
"""
from functools import lru_cache

from datos.lectura_mapeo.mapeo_indicadores_Datos import catalogo_archivos_extractor
from datos.lectura_mapeo.mapeo_por_modulo_Datos import cargar_indicador_extractor
from schemas.model.mapeo_extractor_Model import IndicadorExtractorMapeo
from services.informacion.lista_indicadores_Services import todos_los_indicadores
from shared.reglas_periodicidad import es_periodicidad_de_corte

ANUALIZADO = "mensual anualizado"   # cada mes = ese mes + los 11 anteriores (Neonatal 06)


@lru_cache(maxsize=1)
def indicadores_extractor() -> list[str]:
    """
    Indicadores que usan el motor "extractor" -- un solo Excel mensual (SUI-13 +
    su cruce con Egresos) alimenta a todos al mismo tiempo, cada uno con su
    propia lista de codigos/filtros (ver su bloque "reporte" en indicadores/mapeo/).
    Se calcula del mapeo (modulo="Extractor" + mostrarGenerar=true), mismo
    mecanismo que ya usan FTP/IAAS (todos_los_indicadores) -- agregar o desactivar un
    indicador de Extractor es tocar el mapeo, no este archivo. Cacheado (el mapeo
    no cambia en caliente): esto se consulta en cada lectura de reporte
    (cargar_reporte_indicador), no tiene caso rescanear todos los mapeos cada vez.
    """
    return [ind for categoria in todos_los_indicadores("mostrarGenerar", "extractor") for ind in categoria.indicadores]


##--------------------------------------

@lru_cache(maxsize=None)
def es_indicador_de_corte(indicador: str) -> bool:
    """
    True si el indicador del Extractor se publica por corte (ej. Semestral Anualizado:
    guarda el numerador crudo de cada mes y calcula al juntar la ventana); False si es
    mensual (cada mes se guarda ya calculado). Lo decide la periodicidad del mapeo.
    """
    return es_periodicidad_de_corte(cargar_indicador_extractor(indicador).periodicidad)


##--------------------------------------

@lru_cache(maxsize=1)
def indicadores_extractor_de_corte() -> list[str]:
    """Solo los indicadores del Extractor que trabajan por corte (los que tienen MESES crudo + CORTES)."""
    return [ind for ind in indicadores_extractor() if es_indicador_de_corte(ind)]


##--------------------------------------

def nombre_archivo(clave: str | None) -> str | None:
    """Nombre legible de un archivo del Extractor (mapeo/catalogos/archivos_extractor.json); si no esta, su clave."""
    return catalogo_archivos_extractor().get(clave, {}).get("nombre", clave)


##--------------------------------------

def nombre_sugerido_archivo(clave: str) -> str:
    """Nombre sugerido para guardar el archivo (catalogos/archivos_extractor.json), con {MM} y {AAAA} por llenar."""
    return catalogo_archivos_extractor().get(clave, {}).get("nombreSugerido", f"{clave}_{{MM}}_{{AAAA}}.xlsx")


##--------------------------------------

def archivo_denominador_aparte(indicador: str) -> str | None:
    """Clave del archivo del denominador si es OTRO archivo del Extractor (Neonatal 06: Nacimientos); None si sale del mismo o de poblacion."""
    reporte = cargar_indicador_extractor(indicador).reporte
    archivo = getattr(reporte.denominador, "archivo", None) if getattr(reporte.denominador, "fuente", None) == "extractor" else None
    return archivo if archivo and archivo != reporte.numerador.archivo else None


##--------------------------------------

def archivos_del_indicador(indicador: str) -> list[str]:
    """Todos los archivos del Extractor que hay que subir para el indicador (el base y, si aplica, el del denominador)."""
    return [cargar_indicador_extractor(indicador).reporte.numerador.archivo, *filter(None, [archivo_denominador_aparte(indicador)])]


##--------------------------------------

def configuracion_cruce(mapeo: IndicadorExtractorMapeo) -> dict | None:
    """El bloque 'cruce' del mapeo si el indicador lo tiene activo; None si no usa cruce."""
    cruce = (mapeo.reporte.numerador.model_extra or {}).get("cruce") or {}
    return cruce if cruce.get("activa") else None


##--------------------------------------

def tiene_desfase(mapeo: IndicadorExtractorMapeo) -> bool:
    """True si el mapeo dice que el resultado se reporta en otro mes que el del archivo (Neonatal 04)."""
    return bool((mapeo.reporte.denominador.model_extra or {}).get("mesDelReporte"))
