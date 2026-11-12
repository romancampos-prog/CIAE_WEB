"""
Lectura del historico definitivo de un indicador en BD_CIAE (crudo, como esta en disco): los
meses que ya tiene y sus numeradores. La consulta tipada para graficas y Excel esta en
services/reporte_guardado/reporte_guardado_Services.py.
Usado en: services/{ftp,iaas,poblacion}/*, services/excel/excel_iaas_calculo_Services.py
"""
from datos.bd_ciae.archivos_bd_ciae_Datos import leer_json, ruta_definitivo
from shared.MESES import MESES_ESTANDAR


def meses_con_datos(indicador: str, ano: str) -> list[str]:
    """Meses definitivos guardados, como "01".."12"."""
    meses = leer_json(ruta_definitivo(indicador, ano)).get("MESES", {})
    return [str(MESES_ESTANDAR.index(mes) + 1).zfill(2) for mes in meses if mes in MESES_ESTANDAR]


##--------------------------------------

def leer_historico_indicador(indicador: str, ano: str) -> dict:
    return leer_json(ruta_definitivo(indicador, ano))


##--------------------------------------

def leer_numeradores_todos_meses(indicador: str, ano: str) -> dict[str, dict[str, float | None]]:
    """{"01": {unidad: numerador}, ...} de todos los meses definitivos guardados."""
    numeradores: dict[str, dict[str, float | None]] = {}

    for mes, mes_reporte in leer_historico_indicador(indicador, ano).get("MESES", {}).items():
        if mes not in MESES_ESTANDAR:
            continue
        reporte = mes_reporte.get("Reporte", {}) if isinstance(mes_reporte, dict) else {}
        numeradores[str(MESES_ESTANDAR.index(mes) + 1).zfill(2)] = {
            unidad: datos.get("numerador") for unidad, datos in reporte.items() if isinstance(datos, dict)
        }

    return numeradores
