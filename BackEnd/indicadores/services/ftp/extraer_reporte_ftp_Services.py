"""
Leer un reporte SIAIS en la carpeta del FTP de cada una de las 46 unidades: navegar, bajar el
Excel y sacar de el cada lado (numerador/denominador) con el motor de extraccion. Un fallo en
una unidad no detiene a las demas (queda None y se registra).
Usado en: services/ftp/extraer_indicador_ftp_Services.py
"""
from ftplib import FTP
from typing import Any

import pandas as pd

from schemas.model.generacion_ftp_Model import LogErrores
from service.extraccion_excel.motor_extraccion_Services import extraer
from service.ftp_imss.catalogo_reportes_ftp_Datos import es_de_piramides
from service.ftp_imss.navegacion_ftp_Datos import descargar_archivo, navegar_alguna_ruta
from service.ftp_imss.reportes_siais_ftp_Datos import elegir_archivo_del_periodo, listar_reportes, rutas_de_la_unidad
from services.ftp.errores_extraccion_ftp_Services import registrar_error
from shared.UNIDADES import CLAVE_UNIDADES_F, NOMBREUNIDADESARCHIVO, UNIDADES_FINALES, UNIDADES_PREVIOS

# La clave del catalogo, no la de la carpeta mensual: no siempre coinciden
# (Salvatierra: carpeta 111302, PB02 111303).
_CLAVE_POR_UNIDAD = {nombre: clave for clave, nombre in CLAVE_UNIDADES_F.items()}


def extraer_lados_del_excel(
    buffer, detalles_por_lado: dict[str, dict[str, Any]], mes: str, columnas_por_mes: dict[str, dict[str, str]],
) -> tuple[dict[str, list[float] | None] | None, str | None, str | None]:
    """
    Un mismo archivo se baja UNA vez y de el se lee cada lado que pida ese reporte.
    Regresa (valores por lado, id_error, mensaje); si varios lados fallan se reporta el primer error.
    """

    valores_por_lado: dict[str, list[float] | None] = {}
    primer_error: tuple[str | None, str | None] = (None, None)
    hojas: dict[str, tuple] = {}

    for lado, detalle in detalles_por_lado.items():
        hoja = detalle["hoja"]

        if hoja not in hojas:
            buffer.seek(0)

            try:
                hojas[hoja] = (pd.read_excel(buffer, sheet_name=hoja, header=None), None, None)
            except ValueError:
                hojas[hoja] = (None, "HOJA_NO_ENCONTRADA", f"Hoja '{hoja}' no encontrada en el archivo")
            except Exception as error:
                hojas[hoja] = (None, "ARCHIVO_VACIO", f"No se pudo leer el archivo: {error}")

        df, id_error, mensaje = hojas[hoja]

        if df is None:
            valores_por_lado[lado] = None
        else:
            valores_por_lado[lado], id_error, mensaje = extraer(
                df, detalle["modoExtraccion"], detalle, mes=mes, meses_dinamicos=columnas_por_mes,
            )

        if id_error and primer_error[0] is None:
            primer_error = (id_error, mensaje)

    if all(valor is None for valor in valores_por_lado.values()):
        return None, *primer_error

    return valores_por_lado, *primer_error


##--------------------------------------

def extraer_reporte_de_unidades(
    ftp: FTP, reporte: str, ano: str, mes: str, semana: int | None,
    detalles_por_lado: dict[str, dict[str, Any]], columnas_por_mes: dict[str, dict[str, str]],
    unidades_sin_servicio: list[str], log: LogErrores,
) -> dict[str, dict[str, list[float] | None] | None]:
    """
    Lee un reporte en la carpeta de cada unidad. Regresa {unidad: valores por lado, o None si no
    se pudo}; un fallo en una unidad no detiene a las demas (queda None y se registra).
    """
    unidades_ruta = UNIDADES_PREVIOS if semana is not None else UNIDADES_FINALES
    de_piramides  = es_de_piramides(reporte)
    valores_por_unidad: dict[str, dict[str, list[float] | None] | None] = {}

    for unidad_ruta, unidad in zip(unidades_ruta, NOMBREUNIDADESARCHIVO):
        # Las rutas salen de service/ftp_imss/catalogo_ftp.json (piramides: una sola carpeta del año, sin mes ni semana).
        rutas = rutas_de_la_unidad(reporte, ano, mes, unidad_ruta, semana)
        carpeta = rutas[0]

        try:
            carpeta, navegacion = navegar_alguna_ruta(ftp, rutas)

            if not navegacion.ok:
                registrar_error(log, "RUTA_INVALIDA", unidad, reporte,
                                f"{carpeta}  ✗ fallo en: '{navegacion.segmento_fallido}' — {navegacion.diagnostico}")
                valores_por_unidad[unidad] = None
                continue

            clave = _CLAVE_POR_UNIDAD.get(unidad) if de_piramides else None

            if de_piramides and not clave:
                registrar_error(log, "ARCHIVO_NO_ENCONTRADO", unidad, reporte, f"{carpeta} · la unidad no tiene clave en CLAVE_UNIDADES_F")
                valores_por_unidad[unidad] = None
                continue

            archivos = listar_reportes(ftp, reporte, clave)

            if len(archivos) > 1:
                registrar_error(log, "ARCHIVO_DUPLICADO", unidad, reporte, carpeta)

            if not archivos:
                registrar_error(log, "ARCHIVO_NO_ENCONTRADO", unidad, reporte, carpeta)
                valores_por_unidad[unidad] = None
                continue

            archivo = elegir_archivo_del_periodo(archivos, ano, mes)
            valores, id_error, mensaje = extraer_lados_del_excel(descargar_archivo(ftp, archivo), detalles_por_lado, mes, columnas_por_mes)
            valores_por_unidad[unidad] = valores

            if id_error:
                # Si la unidad no maneja ese servicio, la etiqueta faltante es esperada, no una falla.
                if id_error == "ETIQUETA_NO_ENCONTRADA" and unidad in unidades_sin_servicio:
                    id_error = "SERVICIO_NO_APLICA"
                registrar_error(log, id_error, unidad, reporte, mensaje or carpeta)
        except Exception as error:
            registrar_error(log, "DESCARGA_FALLIDA", unidad, reporte, f"{carpeta} · {error}")
            valores_por_unidad[unidad] = None

    return valores_por_unidad
