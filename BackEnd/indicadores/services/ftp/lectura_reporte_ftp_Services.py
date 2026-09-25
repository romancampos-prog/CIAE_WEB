"""
Lectura de UN reporte Excel ya bajado del FTP (exclusivo de FTP): abre la hoja
y saca de ella el valor de cada lado (numerador/denominador) que pide el mapeo.
Usado en: services/ftp/extraccion_indicador_ftp_Services.py
"""
import io
from typing import Any, NamedTuple

import pandas as pd

from services.metodos_extraccion_excel import extraer


class LecturaReporte(NamedTuple):
    valores_por_lado: dict[str, list[float] | None] | None
    id_error:         str | None = None
    mensaje:          str | None = None


def _leer_hoja(buffer: io.BytesIO, hoja: str) -> tuple[pd.DataFrame | None, str | None, str | None]:
    buffer.seek(0)
    try:
        return pd.read_excel(buffer, sheet_name=hoja, header=None), None, None
    except ValueError:
        return None, "HOJA_NO_ENCONTRADA", f"Hoja '{hoja}' no encontrada en el archivo"
    except Exception as error:
        return None, "ARCHIVO_VACIO", f"No se pudo leer el archivo: {error}"


def extraer_lados_del_excel(
    buffer: io.BytesIO, detalles_por_lado: dict[str, dict[str, Any]],
    mes: str, meses_cip01: dict[str, str],
) -> LecturaReporte:
    """
    Un mismo archivo se baja UNA vez y de el se lee cada lado que pida ese reporte.
    Si varios lados fallan se reporta el primer error (se registra uno por reporte y unidad).
    """
    valores_por_lado: dict[str, list[float] | None] = {}
    primer_error: tuple[str | None, str | None] = (None, None)
    hojas: dict[str, tuple] = {}

    for lado, detalle in detalles_por_lado.items():
        hoja = detalle["hoja"]
        if hoja not in hojas:
            hojas[hoja] = _leer_hoja(buffer, hoja)
        df, id_error, mensaje = hojas[hoja]
        if df is None:
            valores_por_lado[lado] = None
        else:
            valores_por_lado[lado], id_error, mensaje = extraer(
                df, detalle["modoExtraccion"], detalle,
                mes=mes, meses_dinamicos={"MESES_CIP01": meses_cip01},
            )
        if id_error and primer_error[0] is None:
            primer_error = (id_error, mensaje)

    if all(valor is None for valor in valores_por_lado.values()):
        return LecturaReporte(None, *primer_error)
    return LecturaReporte(valores_por_lado, *primer_error)
