"""
Extraccion de numerador/denominador de los Excel que sube el usuario en IAAS (exclusivo de
IAAS), leyendo el mapeo unificado (indicadores/mapeo/IAAS.json).

Capa 1 (leer la hoja del Excel subido y validar que sea el archivo correcto) vive aqui;
capa 2 (contar filas / tomar el valor de la unidad) la hace services/metodos_extraccion_excel.py.
Cuando algo esta mal en un archivo se levanta ErroresValidacionExcel con la lista de mensajes.
Usado en: services/iaas/calculo_iaas_Services.py
"""
import io
import json
from collections.abc import Mapping

import pandas as pd

from schemas.model.reporte_mapeo_Model import FuenteExcelWeb
from services.indicadorMapeo_Services import cargar_indicador_iaas
from services.metodos_extraccion_excel import (
    ERRORES, coincide_unidad, columnas_esperadas, extraer, letra_a_numero,
)
from shared.UNIDADES import ORDEN_IAAS01
from shared.validarArchivo_service import ejecutar_validaciones, validar_columnas_esperadas

CLAVE_TOTAL = "TOTAL_OOAD"


class ErroresValidacionExcel(ValueError):
    """Un Excel subido no es el correcto; mensajes es lo que se le muestra al usuario."""
    def __init__(self, mensajes: list[str]):
        super().__init__(json.dumps(mensajes))
        self.mensajes = mensajes


def _leer_hoja(excel_bytes: bytes, fuente: FuenteExcelWeb) -> pd.DataFrame:
    return pd.read_excel(io.BytesIO(excel_bytes), sheet_name=fuente.hoja, header=fuente.encabezado - 1)


def _clave_unidad(nombre: str) -> str:
    """Tipo + numero ("HGZMF 2"), tolerando HGSZ==HGS y variaciones del nombre de ciudad."""
    tokens = nombre.strip().upper().split()
    if len(tokens) < 2:
        return nombre.strip().upper()
    tipo = tokens[0]
    if tipo.startswith("HGSZ"):
        tipo = "HGS" + tipo[4:]
    return f"{tipo} {tokens[1]}"


def _validar_pertenencia_unidad(df: pd.DataFrame, unidad_esperada: str) -> list[str]:
    """La columna E de cada Excel trae la unidad a la que pertenece: debe ser la que se dijo al subirlo."""
    try:
        valores = df.iloc[:, letra_a_numero("E")].dropna()
    except IndexError:
        return []
    if len(valores) == 0:
        return []
    del_excel = str(valores.iloc[0])
    if _clave_unidad(del_excel) != _clave_unidad(unidad_esperada):
        return [
            f"El Excel pertenece a '{del_excel.strip()}', "
            f"no a '{unidad_esperada}'. Verifica que subiste el archivo correcto."
        ]
    return []


def _validar_excel(df: pd.DataFrame, esperadas: dict[str, str], prefijo: str, unidad: str | None) -> list[str]:
    errores = ejecutar_validaciones([lambda: validar_columnas_esperadas(list(df.columns), esperadas, prefijo)])
    if not errores and unidad:
        errores = ejecutar_validaciones([lambda: _validar_pertenencia_unidad(df, unidad)])
    return errores


def validar_excel_unidad(excel_bytes: bytes, unidad: str, indicador: str) -> None:
    """Levanta ErroresValidacionExcel si el Excel de una unidad no es el correcto para ese indicador."""
    fuente    = cargar_indicador_iaas(indicador).reporte.numerador
    esperadas = columnas_esperadas(fuente.modoExtraccion, fuente.model_dump())
    prefijo   = f"[{unidad}] "
    try:
        df = _leer_hoja(excel_bytes, fuente)
    except ValueError:
        raise ErroresValidacionExcel([f"{prefijo}El Excel no contiene la hoja '{fuente.hoja}'."])
    errores = _validar_excel(df, esperadas, prefijo, unidad)
    if errores:
        raise ErroresValidacionExcel(errores)


def obtener_numerador(exceles_por_unidad: Mapping[str, bytes], indicador: str) -> dict[str, int]:
    """{unidad: bytes del Excel} -> {unidad: conteo, "TOTAL_OOAD": suma}."""
    fuente    = cargar_indicador_iaas(indicador).reporte.numerador
    detalle   = fuente.model_dump()
    esperadas = columnas_esperadas(fuente.modoExtraccion, detalle)

    resultado: dict[str, int] = {}
    errores:   list[str] = []

    for unidad, excel in exceles_por_unidad.items():
        prefijo = f"[{unidad}] "
        try:
            df = _leer_hoja(excel, fuente)
        except ValueError:
            errores.append(f"{prefijo}El Excel no contiene la hoja '{fuente.hoja}'.")
            continue

        errores_excel = _validar_excel(df, esperadas, prefijo, unidad)
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


def _fuente_denominador_iaas01() -> tuple[FuenteExcelWeb, dict]:
    fuente = cargar_indicador_iaas("IAAS 01").reporte.denominador
    return fuente, fuente.model_dump()


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


def obtener_denominador_iaas01(excel_bytes: bytes) -> dict[str, int]:
    """Excel global de dias paciente -> {unidad: dias paciente, "TOTAL_OOAD": suma}."""
    fuente, detalle = _fuente_denominador_iaas01()
    esperadas = columnas_esperadas(fuente.modoExtraccion, detalle)

    try:
        df = _leer_hoja(excel_bytes, fuente)
    except ValueError:
        raise ErroresValidacionExcel([f"El Excel no contiene la hoja '{fuente.hoja}'."])

    errores = _validar_excel(df, esperadas, "", None)

    if not errores:
        col_unidad = df.iloc[:, letra_a_numero(next(iter(detalle["columnaUnidad"])))].astype(str)
        if not any(col_unidad.map(lambda v, u=u: coincide_unidad(v, u)).any() for u in ORDEN_IAAS01):
            errores.append("[Denominador global] No se encontraron las unidades de IAAS 01 en la columna de unidades.")

    if errores:
        raise ErroresValidacionExcel(errores)

    resultado: dict[str, int] = {}
    for unidad in ORDEN_IAAS01:
        # El Excel global si se subio -- una unidad que no aparece en el es un cero real
        # (no reporto casos), no un dato faltante.
        valor, _ = _valor_denominador(df, fuente, detalle, unidad, f"[{unidad}] ")
        resultado[unidad] = valor if valor is not None else 0

    resultado[CLAVE_TOTAL] = sum(v for v in resultado.values() if v is not None)
    return resultado


def obtener_denominador_iaas01_unidad(excel_bytes: bytes, unidad: str) -> int | None:
    """
    Denominador de IAAS 01 para UNA unidad tardia. Aqui no hay garantia de que el archivo
    traiga todas las unidades, asi que si no aparece la fila de esta unidad es dato
    faltante (None), no cero.
    """
    fuente, detalle = _fuente_denominador_iaas01()
    try:
        df = _leer_hoja(excel_bytes, fuente)
    except ValueError:
        raise ErroresValidacionExcel([f"[{unidad}] El Excel no contiene la hoja '{fuente.hoja}' para el denominador de IAAS 01."])

    valor, _ = _valor_denominador(df, fuente, detalle, unidad, f"[{unidad}] ")
    return valor
