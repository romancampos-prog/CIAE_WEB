"""
Módulo  : info_service.py
Carpeta : indicadores_IN_ASS/services/
Qué hace: Lee el catálogo IN_ASS.json y devuelve información de indicadores y unidades.
Usado en: in_ass_controller.py, extraccion_service.py
"""
import json
from configs.settings import RUTA_IN_ASS_JSON
from configs.unidades import ORDEN_DEMAS_IN_ASS, UNIDADES_HGS_IN_ASS01


def obtener_config_indicador(indicador: str) -> dict:
    with open(RUTA_IN_ASS_JSON, "r", encoding="utf-8") as f:
        datos = json.load(f)
    return datos.get(indicador, {})


def infoAllInAss() -> dict:
    resultado = {}
    with open(RUTA_IN_ASS_JSON, "r", encoding="utf-8") as f:
        datos = json.load(f)

    for indicador, info in datos.items():
        if not info.get("mostrar", True):
            continue
        entry = {
            "titulo":                 info.get("titulo"),
            "descripcionNumerador":   info.get("descripcionNumerador"),
            "descripcionDenominador": info.get("descripcionDenominador"),
            "semaforo":               info.get("Semaforo"),
            "unidades_hgs":           UNIDADES_HGS_IN_ASS01 if indicador == "IN_ASS 01" else [],
        }
        resultado[indicador] = entry

    return resultado


def obtenerUnidadesInAss() -> list:
    return ORDEN_DEMAS_IN_ASS


def obtenerIndicadoresInAss() -> list:
    with open(RUTA_IN_ASS_JSON, "r", encoding="utf-8") as f:
        datos = json.load(f)
    return [{"id": key, **val} for key, val in datos.items() if val.get("mostrar", True)]
