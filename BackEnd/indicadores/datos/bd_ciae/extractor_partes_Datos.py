"""
BD_CIAE/INDICADORES/{año}/EXTRACTOR_PARTES: el conteo de cada archivo del Extractor cuando el
numerador y el denominador salen de archivos distintos (Neonatal 04 y 06) o el mes es anualizado.
Usado en: services/extractor/*
"""
from datos.bd_ciae.archivos_bd_ciae_Datos import escribir_json, leer_json_para_actualizar, ruta_extractor


def leer_partes(indicador: str, anio: int) -> dict:
    """{mes: {"numerador": {unidad: n}, "denominador": {unidad: n}}} -- cada lado solo si ya se subio su archivo."""
    return leer_json_para_actualizar(ruta_extractor("EXTRACTOR_PARTES", indicador, anio), {})


##--------------------------------------

def guardar_parte_mes(indicador: str, anio: int, mes_nombre: str, lado: str, conteo_por_unidad: dict) -> dict:
    """
    Guarda (o reemplaza) el conteo de un lado del mes y regresa las partes de ese mes. Se
    conserva aunque el mes ya se haya generado: si despues se corrige solo uno de los dos
    archivos, el otro lado sigue aqui y el mes se recalcula sin volver a subirlo.
    """
    partes = leer_partes(indicador, anio)
    partes.setdefault(mes_nombre, {})[lado] = conteo_por_unidad
    escribir_json(ruta_extractor("EXTRACTOR_PARTES", indicador, anio), partes)
    return partes[mes_nombre]
