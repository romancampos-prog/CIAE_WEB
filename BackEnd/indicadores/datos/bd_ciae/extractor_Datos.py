"""
Los JSON del Extractor en BD_CIAE/INDICADORES/{año}:
  - el reporte del indicador: "MESES" con el numerador crudo de cada mes (el corte va aparte en "CORTES")
  - EXTRACTOR_PARTES: el conteo de cada archivo cuando numerador y denominador salen de archivos
    distintos (Neonatal 04 y 06), el mes es anualizado o se cuenta por mes de ingreso (EH 03, DM 04, DM 05)
Usado en: services/extractor/*
"""
from datos.bd_ciae.archivos_bd_ciae_Datos import escribir_json, leer_json_para_actualizar, ruta_definitivo, ruta_extractor
from shared.UNIDADES import NOMBREUNIDADESARCHIVO


def leer_reporte_extractor(indicador: str, anio: int) -> dict:
    """El JSON del indicador del Extractor; si no existe, uno vacio para empezar a llenarlo."""
    return leer_json_para_actualizar(ruta_definitivo(indicador, anio), {"INDICADOR": indicador, "ANIO": anio, "MESES": {}})


##--------------------------------------

def guardar_reporte_extractor(indicador: str, anio: int, reporte: dict) -> None:
    escribir_json(ruta_definitivo(indicador, anio), reporte)


##--------------------------------------

def guardar_numerador_mes(indicador: str, anio: int, mes_nombre: str, conteo_por_unidad: dict) -> None:
    """
    Guarda (o reemplaza) el numerador crudo de un mes del Extractor de corte (todos los casos
    del archivo), siempre con las 46 unidades (en 0 las que no tuvieron casos); marca el mes
    como subido. El corte calculado va aparte en "CORTES.MESES" y se suma desde
    EXTRACTOR_PARTES (por mes de ingreso), no desde aqui.
    """
    reporte = leer_reporte_extractor(indicador, anio)
    reporte["MESES"][mes_nombre] = {
        unidad: {"numerador": conteo_por_unidad.get(unidad, 0), "desempeno": "Gris"}
        for unidad in NOMBREUNIDADESARCHIVO
    }

    guardar_reporte_extractor(indicador, anio, reporte)


##--------------------------------------

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

