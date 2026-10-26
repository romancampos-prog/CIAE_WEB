"""
El mapeo de un indicador ya tipado segun su modulo: lo que necesita su extraccion (reportes,
formulas y semaforo). IAAS se guarda en memoria al primer uso (tras editar su JSON hay que
reiniciar el backend); FTP y Extractor se releen al cambiar el JSON.
Usado en: services/{ftp,iaas,extractor,poblacion}/*, services/excel/excel_iaas_*
"""
from functools import lru_cache

from datos.lectura_mapeo.mapeo_indicadores_Datos import bloque_mapeo
from schemas.model.mapeo_extractor_Model import IndicadorExtractorMapeo
from schemas.model.mapeo_ftp_Model import IndicadorFTPMapeo
from schemas.model.mapeo_iaas_Model import IndicadorIAASMapeo


def _bloque_obligatorio(indicador: str) -> dict:
    bloque = bloque_mapeo(indicador)
    if bloque is None:
        raise KeyError(f"{indicador} no existe en el mapeo")
    return bloque


##--------------------------------------

def cargar_indicador_ftp(indicador: str) -> IndicadorFTPMapeo:
    return IndicadorFTPMapeo.model_validate(_bloque_obligatorio(indicador))


##--------------------------------------

@lru_cache(maxsize=None)
def cargar_indicador_iaas(indicador: str) -> IndicadorIAASMapeo:
    return IndicadorIAASMapeo.model_validate(_bloque_obligatorio(indicador))


##--------------------------------------

def cargar_indicador_extractor(indicador: str) -> IndicadorExtractorMapeo:
    return IndicadorExtractorMapeo.model_validate(_bloque_obligatorio(indicador))
