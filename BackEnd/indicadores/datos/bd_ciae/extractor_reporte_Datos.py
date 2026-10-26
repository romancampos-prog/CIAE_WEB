"""
El JSON de un indicador del Extractor de corte en BD_CIAE: leerlo completo, guardarlo y
guardar el numerador crudo de un mes (en "MESES"; el corte va aparte en "CORTES").
Usado en: services/extractor/*
"""
from datos.bd_ciae.archivos_bd_ciae_Datos import escribir_json, leer_json_para_actualizar, ruta_definitivo
from shared.UNIDADES import NOMBREUNIDADESARCHIVO


def leer_reporte_extractor(indicador: str, anio: int) -> dict:
    """El JSON del indicador del Extractor; si no existe, uno vacio para empezar a llenarlo."""
    return leer_json_para_actualizar(ruta_definitivo(indicador, anio), {"INDICADOR": indicador, "ANIO": anio, "MESES": {}})


##--------------------------------------

def guardar_reporte_extractor(indicador: str, anio: int, reporte: dict) -> None:
    escribir_json(ruta_definitivo(indicador, anio), reporte)


##--------------------------------------

def guardar_numerador_mes(indicador: str, anio: int, mes_nombre: str, conteo_por_unidad: dict, cruce_aplicado: bool | None = None) -> None:
    """
    Guarda (o reemplaza) el numerador crudo de un mes del Extractor de corte, siempre con las
    46 unidades (en 0 las que no tuvieron casos). "MESES" es SIEMPRE el dato crudo, incluso en
    Junio/Diciembre: el corte calculado va aparte en "CORTES.MESES", asi un mes de corte sigue
    sirviendo para la ventana del siguiente corte.
    cruce_aplicado (solo si el mapeo pide cruce): True si el mes ya se valido contra Egresos,
    False si falta la via 2. Va en "CRUCE", aparte de las unidades.
    """
    reporte = leer_reporte_extractor(indicador, anio)
    reporte["MESES"][mes_nombre] = {
        unidad: {"numerador": conteo_por_unidad.get(unidad, 0), "desempeno": "Gris"}
        for unidad in NOMBREUNIDADESARCHIVO
    }

    if cruce_aplicado is not None:
        reporte.setdefault("CRUCE", {})[mes_nombre] = cruce_aplicado

    guardar_reporte_extractor(indicador, anio, reporte)
