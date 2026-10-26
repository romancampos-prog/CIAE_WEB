"""
BD_CIAE/INDICADORES/{año}/EXTRACTOR_CRUCE: lo que el SUI-13 del mes dejo listo para el cruce
con Egresos (via 1 y candidatos de la via 2), para subir el Egresos despues.
Usado en: services/extractor/generar_corte_Services.py, services/extractor/completar_cruce_Services.py
"""
from datos.bd_ciae.archivos_bd_ciae_Datos import escribir_json, leer_json_para_actualizar, ruta_extractor


def guardar_pendiente_cruce(indicador: str, anio: int, mes_nombre: str, via1: dict, candidatos: list[dict]) -> None:
    """
    Lo que el SUI-13 del mes dejo listo para el cruce (conteo de la via 1 y candidatos de la
    via 2 con su llave cifrada): asi el Egresos se puede subir despues, sin volver a subir el SUI-13.
    """
    ruta = ruta_extractor("EXTRACTOR_CRUCE", indicador, anio)
    contenido = leer_json_para_actualizar(ruta, {})
    contenido[mes_nombre] = {
        "via1": via1,
        "candidatos": [{"unidad": c["unidad"], "llave": None if c["llave"] is None else str(c["llave"])} for c in candidatos],
    }
    escribir_json(ruta, contenido)


##--------------------------------------

def leer_pendiente_cruce(indicador: str, anio: int, mes_nombre: str) -> dict | None:
    return leer_json_para_actualizar(ruta_extractor("EXTRACTOR_CRUCE", indicador, anio), {}).get(mes_nombre)
