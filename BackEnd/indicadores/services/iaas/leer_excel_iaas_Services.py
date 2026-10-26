"""
Leer el Excel que sube una unidad en IAAS y validar que sea el correcto (la hoja con los
encabezados del mapeo y que pertenezca a esa unidad). Si algo esta mal se levanta
ErroresValidacionExcel con la lista de mensajes.
Usado en: services/iaas/*
"""
import pandas as pd
from fastapi import HTTPException

from datos.excel_subido.lector_excel_Datos import HojaNoEncontrada, LectorExcel, numeros_escritos_como_texto
from datos.lectura_mapeo.mapeo_por_modulo_Datos import cargar_indicador_iaas
from schemas.model.mapeo_iaas_Model import FuenteExcelWeb
from services.compartido.extraccion.motor_extraccion_Services import columnas_esperadas
from shared.columnas_excel import letra_a_numero


class ErroresValidacionExcel(HTTPException):
    """Un Excel subido no es el correcto: se responde 400 con la lista de mensajes para el usuario."""

    def __init__(self, mensajes: list[str]):
        super().__init__(status_code=400, detail=mensajes)
        self.mensajes = mensajes


##--------------------------------------

def leer_hoja_excel_iaas(excel_bytes: bytes, fuente: FuenteExcelWeb, prefijo: str = "") -> pd.DataFrame:
    """La hoja que trae los encabezados del mapeo en sus letras, se llame como se llame (el usuario la nombra a mano)."""
    detalle = fuente.model_dump()

    try:
        df = LectorExcel(excel_bytes).hoja_con_columnas(columnas_esperadas(fuente.modoExtraccion, detalle), fuente.encabezado)
        return numeros_escritos_como_texto(df, detalle)
    except HojaNoEncontrada as error:
        raise ErroresValidacionExcel([f"{prefijo}{mensaje}" for mensaje in error.mensajes])
    except ValueError as error:
        raise ErroresValidacionExcel([f"{prefijo}{error}"])


##--------------------------------------

def _clave_unidad(nombre: str) -> str:
    """Tipo + numero ("HGZMF 2"), tolerando HGSZ==HGS y variaciones del nombre de ciudad."""
    tokens = nombre.strip().upper().split()

    if len(tokens) < 2:
        return nombre.strip().upper()

    tipo = tokens[0]

    if tipo.startswith("HGSZ"):
        tipo = "HGS" + tipo[4:]

    return f"{tipo} {tokens[1]}"


##--------------------------------------

def validar_pertenencia_unidad(df: pd.DataFrame, unidad_esperada: str) -> list[str]:
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


##--------------------------------------

def validar_excel_unidad(excel_bytes: bytes, unidad: str, indicador: str) -> None:
    """Levanta ErroresValidacionExcel si el Excel de una unidad no es el correcto para ese indicador."""
    fuente = cargar_indicador_iaas(indicador).reporte.numerador
    df = leer_hoja_excel_iaas(excel_bytes, fuente, f"[{unidad}] ")   # ya valida los encabezados
    errores = validar_pertenencia_unidad(df, unidad)

    if errores:
        raise ErroresValidacionExcel(errores)
