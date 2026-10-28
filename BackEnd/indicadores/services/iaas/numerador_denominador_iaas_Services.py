"""
Numerador (conteo de filas del Excel de cada unidad) y denominador de IAAS 01 (del Excel global
de dias paciente, para todas las unidades o para una tardia), con el motor de extraccion.
Usado en: services/iaas/generar_mes_iaas_Services.py, services/iaas/completar_unidad_iaas_Services.py
"""
from collections.abc import Mapping

import pandas as pd

from compartido.extraccion_excel.columnas_excel import letra_a_numero
from compartido.extraccion_excel.modos_por_filtro.coincide_unidad_Services import coincide_unidad
from compartido.extraccion_excel.motor_extraccion_Services import ERRORES, extraer
from datos.lectura_mapeo.mapeo_por_modulo_Datos import cargar_indicador_iaas
from schemas.model.mapeo_iaas_Model import FuenteExcelWeb
from services.calculo.resultado_unidades_Services import CLAVE_TOTAL
from services.iaas.leer_excel_iaas_Services import ErroresValidacionExcel, leer_hoja_excel_iaas, validar_pertenencia_unidad
from shared.UNIDADES import ORDEN_IAAS01


def obtener_numerador(exceles_por_unidad: Mapping[str, bytes], indicador: str) -> dict[str, int]:
    """{unidad: bytes del Excel} -> {unidad: conteo, "TOTAL_OOAD": suma}."""

    fuente  = cargar_indicador_iaas(indicador).reporte.numerador
    detalle = fuente.model_dump()

    resultado: dict[str, int] = {}
    errores:   list[str] = []

    for unidad, excel in exceles_por_unidad.items():
        prefijo = f"[{unidad}] "

        try:
            df = leer_hoja_excel_iaas(excel, fuente, prefijo)   # ya valida los encabezados
        except ErroresValidacionExcel as error:
            errores.extend(error.mensajes)
            continue

        errores_excel = validar_pertenencia_unidad(df, unidad)

        if errores_excel:
            errores.extend(errores_excel)
            continue

        # Si la unidad si subio su Excel pero ninguna fila cumple el filtro, es un cero
        # real, no un dato faltante -- la unidad sin Excel simplemente no entra en este
        # diccionario (y sigue siendo None mas adelante).
        valor, id_error, mensaje = extraer(df, fuente.modoExtraccion, detalle)

        if id_error:
            errores.append(f"{prefijo}{mensaje or ERRORES[id_error]}")
            continue

        resultado[unidad] = valor

    if errores:
        raise ErroresValidacionExcel(errores)

    resultado[CLAVE_TOTAL] = sum(v for v in resultado.values() if v is not None)

    return resultado


##--------------------------------------

def _valor_denominador(df: pd.DataFrame, fuente: FuenteExcelWeb, detalle: dict, unidad: str, prefijo: str) -> tuple[int | None, bool]:
    """(valor | None, es_dato_faltante). Unidad sin fila en el Excel -> (None, True); cualquier otro error se levanta."""
    valor, id_error, mensaje = extraer(df, fuente.modoExtraccion, detalle, nombre_unidad_buscada=unidad)

    if id_error == "ETIQUETA_NO_ENCONTRADA":
        return None, True
    if id_error:
        raise ErroresValidacionExcel([f"{prefijo}{mensaje or ERRORES[id_error]}"])
    if valor is None:
        raise ErroresValidacionExcel([f"{prefijo}El valor del denominador de '{unidad}' no es numerico."])

    return int(valor), False


##--------------------------------------

def obtener_denominador_iaas01(excel_bytes: bytes) -> dict[str, int]:
    """Excel global de dias paciente -> {unidad: dias paciente, "TOTAL_OOAD": suma}."""

    fuente = cargar_indicador_iaas("IAAS 01").reporte.denominador
    detalle = fuente.model_dump()
    df = leer_hoja_excel_iaas(excel_bytes, fuente)   # ya valida los encabezados

    col_unidad = df.iloc[:, letra_a_numero(next(iter(detalle["columnaUnidad"])))].astype(str)

    if not any(col_unidad.map(lambda v, u=u: coincide_unidad(v, u)).any() for u in ORDEN_IAAS01):
        raise ErroresValidacionExcel(["[Denominador global] No se encontraron las unidades de IAAS 01 en la columna de unidades."])

    resultado: dict[str, int] = {}

    for unidad in ORDEN_IAAS01:
        # El Excel global si se subio -- una unidad que no aparece en el es un cero real
        # (no reporto casos), no un dato faltante.
        valor, _ = _valor_denominador(df, fuente, detalle, unidad, f"[{unidad}] ")
        resultado[unidad] = valor if valor is not None else 0

    resultado[CLAVE_TOTAL] = sum(v for v in resultado.values() if v is not None)

    return resultado


##--------------------------------------

def obtener_denominador_iaas01_unidad(excel_bytes: bytes, unidad: str) -> int | None:
    """
    Denominador de IAAS 01 para UNA unidad tardia. Aqui no hay garantia de que el archivo
    traiga todas las unidades, asi que si no aparece la fila de esta unidad es dato
    faltante (None), no cero.
    """
    fuente = cargar_indicador_iaas("IAAS 01").reporte.denominador
    detalle = fuente.model_dump()
    df = leer_hoja_excel_iaas(excel_bytes, fuente, f"[{unidad}] Denominador de IAAS 01: ")

    valor, _ = _valor_denominador(df, fuente, detalle, unidad, f"[{unidad}] ")
    return valor
