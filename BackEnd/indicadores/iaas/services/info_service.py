import json
from iaas.config import RUTA_IAAS_JSON
from iaas.config import ORDEN_DEMAS_IAAS, UNIDADES_HGS_IAAS01, UNIDAD_TIPO_IAAS01


def obtener_config_indicador(indicador: str) -> dict:
    with open(RUTA_IAAS_JSON, "r", encoding="utf-8") as f:
        datos = json.load(f)
    return datos.get(indicador, {})


def infoAllIAAS() -> dict:
    resultado = {}
    with open(RUTA_IAAS_JSON, "r", encoding="utf-8") as f:
        datos = json.load(f)

    for indicador, info in datos.items():
        if not info.get("mostrar", True):
            continue
        es_iaas01 = indicador == "IAAS 01"
        entry = {
            "titulo":                 info.get("titulo"),
            "descripcionNumerador":   info.get("descripcionNumerador"),
            "descripcionDenominador": info.get("descripcionDenominador"),
            "semaforo":               info.get("Semaforo"),
            "unidades_hgs":           UNIDADES_HGS_IAAS01 if es_iaas01 else [],
            "unidad_tipo":            UNIDAD_TIPO_IAAS01   if es_iaas01 else {},
        }
        resultado[indicador] = entry

    return resultado


def obtenerUnidadesIAAS() -> list:
    return ORDEN_DEMAS_IAAS


def obtenerIndicadoresIAAS() -> list:
    with open(RUTA_IAAS_JSON, "r", encoding="utf-8") as f:
        datos = json.load(f)
    return [{"id": key, **val} for key, val in datos.items() if val.get("mostrar", True)]
