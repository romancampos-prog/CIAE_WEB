from iaas.config import ORDEN_DEMAS_IAAS, UNIDADES_HGS_IAAS01, UNIDAD_TIPO_IAAS01
from iaas.services.datos_json_service import leer_config_iaas


def obtener_config_indicador(indicador: str) -> dict:
    datos = leer_config_iaas()
    return datos.get(indicador, {})


def infoAllIAAS() -> dict:
    resultado = {}
    datos = leer_config_iaas()

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
    datos = leer_config_iaas()
    return [{"id": key, **val} for key, val in datos.items() if val.get("mostrar", True)]
