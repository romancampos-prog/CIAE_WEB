"""
Módulo  : info_service.py
Carpeta : indicadores_IASS/services/
Qué hace: Lee el catálogo IASS.json y devuelve información de indicadores y unidades.
Usado en: IASS_controller.py, extraccion_service.py
"""
import json
from configs.settings import RUTA_IASS_JSON
from configs.unidades import ORDEN_DEMAS_IASS, UNIDADES_HGS_IASS01


def obtener_config_indicador(indicador: str) -> dict:
    with open(RUTA_IASS_JSON, "r", encoding="utf-8") as f:
        datos = json.load(f)
    return datos.get(indicador, {})


def infoAllIASS() -> dict:
    resultado = {}
    with open(RUTA_IASS_JSON, "r", encoding="utf-8") as f:
        datos = json.load(f)

    for indicador, info in datos.items():
        if not info.get("mostrar", True):
            continue
        entry = {
            "titulo":                 info.get("titulo"),
            "descripcionNumerador":   info.get("descripcionNumerador"),
            "descripcionDenominador": info.get("descripcionDenominador"),
            "semaforo":               info.get("Semaforo"),
            "unidades_hgs":           UNIDADES_HGS_IASS01 if indicador == "IASS 01" else [],
        }
        resultado[indicador] = entry

    return resultado


def obtenerUnidadesIASS() -> list:
    return ORDEN_DEMAS_IASS


def obtenerIndicadoresIASS() -> list:
    with open(RUTA_IASS_JSON, "r", encoding="utf-8") as f:
        datos = json.load(f)
    return [{"id": key, **val} for key, val in datos.items() if val.get("mostrar", True)]
