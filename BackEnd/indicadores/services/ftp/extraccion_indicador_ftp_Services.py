"""
Extraccion de los datos de un indicador de FTP (exclusivo de FTP): recorre los reportes que
pide el mapeo en las carpetas de las 46 unidades, lee de cada Excel lo de cada lado
(numerador/denominador) y, si el denominador sale de la poblacion, lo lee de
POBLACION_{año}.json. No calcula nada: entrega lo leido y las "restricciones" (errores por
unidad y ruta) que el front muestra.
Usado en: services/ftp/generacion_indicador_ftp_Services.py
"""
from ftplib import FTP
from typing import Any

import pandas as pd

from schemas.model.generacion_Model import DatosExtraidosUnidad, ErrorExtraccion, LogErrores, RutaAfectada
from schemas.model.reporte_mapeo_Model import FuenteArchivosFTP, FuentePoblacionInfoSalud, IndicadorFTPMapeo
from services.ftp.navegacion_ftp_Services import (
    REPORTES_DE_PIRAMIDES, codigo_base, conectar_ftp, descargar_archivo, desconectar_ftp, listar_reportes,
    navegar_ruta, ruta_reportes_unidad, subcarpeta_de_reporte,
)
from services.metodos_extraccion_excel import extraer
from services.poblacion_Services import extraer_poblacion
from shared.UNIDADES import CLAVE_UNIDADES_F, NOMBREUNIDADESARCHIVO, UNIDADES_FINALES, UNIDADES_PREVIOS

_CATALOGO_ERRORES: dict[str, tuple[str, str]] = {
    "RUTA_INVALIDA":          ("Ruta de acceso incorrecta",      "La carpeta en el FTP no existe o está mal nombrada."),
    "ARCHIVO_NO_ENCONTRADO":  ("Archivo no encontrado",          "El archivo no se encontró en la ubicación esperada."),
    "ARCHIVO_DUPLICADO":      ("Archivo duplicado",              "Se encontró más de un archivo con el mismo prefijo. Se usó el primero encontrado."),
    "HOJA_NO_ENCONTRADA":     ("Pestaña faltante",               "El archivo existe pero no contiene la hoja especificada."),
    "ETIQUETA_NO_ENCONTRADA": ("Etiqueta no encontrada en Excel", "El texto que se buscaba como etiqueta de fila no existe en esa columna de la hoja indicada."),
    "SERVICIO_NO_APLICA":     ("No se encontró tal servicio",    "Esta unidad no ha registrado este servicio en los meses anteriores."),
    "ARCHIVO_VACIO":          ("Archivo sin datos numéricos",    "El archivo existe y la hoja fue leída, pero las celdas de datos están vacías o no son numéricas."),
    "VALOR_NULO":             ("Celda sin dato",                 "El archivo tiene datos pero alguna celda específica está vacía o no es numérica. Se usó 0 en su lugar."),
    "DESCARGA_FALLIDA":       ("Error al descargar archivo",     "El archivo existe en el FTP pero no pudo descargarse (error de red, permisos o archivo corrupto)."),
    "PB_JSON_ERROR":          ("Error en población JSON",        "La unidad o columna solicitada no existe en POBLACION.json."),
}

# La clave del catalogo, no la de la carpeta mensual: no siempre coinciden
# (Salvatierra: carpeta 111302, PB02 111303).
_CLAVE_POR_UNIDAD = {nombre: clave for clave, nombre in CLAVE_UNIDADES_F.items()}


def registrar_error(log: LogErrores, id_error: str, unidad: str, reporte: str, ruta_afectada: str) -> None:
    rutas_de_la_unidad = log[id_error].unidades.setdefault(unidad, [])
    existente = next((r for r in rutas_de_la_unidad if r.ruta == ruta_afectada), None)
    if existente is None:
        rutas_de_la_unidad.append(RutaAfectada(reportes=[reporte], ruta=ruta_afectada))
    elif reporte not in existente.reportes:
        existente.reportes.append(reporte)


##--------------------------------------

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
    de_piramides  = codigo_base(reporte) in REPORTES_DE_PIRAMIDES
    subcarpeta    = None if de_piramides else subcarpeta_de_reporte(reporte)
    valores_por_unidad: dict[str, dict[str, list[float] | None] | None] = {}

    for unidad_ruta, unidad in zip(unidades_ruta, NOMBREUNIDADESARCHIVO):
        # Piramides (PB02): una sola carpeta del año con un archivo por unidad (no depende del mes ni de la semana).
        carpeta = (f"01. DATAMARTEM/ArchsDataMart_{ano}/Piramides para {ano} por unidades" if de_piramides
                   else ruta_reportes_unidad(ano, mes, unidad_ruta, subcarpeta, semana))
        try:
            navegacion = navegar_ruta(ftp, carpeta)
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

            valores, id_error, mensaje = extraer_lados_del_excel(descargar_archivo(ftp, archivos[0]), detalles_por_lado, mes, columnas_por_mes)
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


##--------------------------------------

def extraer_indicador(indicador: str, ano: str, mes: str, semana: int | None, mapeo: IndicadorFTPMapeo) -> tuple[dict[str, DatosExtraidosUnidad], LogErrores]:
    """Regresa (lo leido por unidad, errores encontrados)."""
    reporte   = mapeo.reporte
    extraidos = {unidad: DatosExtraidosUnidad() for unidad in NOMBREUNIDADESARCHIVO}
    log       = {id_error: ErrorExtraccion(nombreError=nombre, descripcionError=descripcion)
                 for id_error, (nombre, descripcion) in _CATALOGO_ERRORES.items()}

    # 1. Agrupar lo que se lee por reporte real: "IN33_MF"/"IN33_40" (DM 03) son dos HOJAS del
    #    MISMO archivo (el sufijo solo distingue la fuente en la formula), asi se baja una sola
    #    vez. La llave "lado::codigo" se desempaca al final para que cada codigo siga siendo su fuente.
    detalles_por_prefijo: dict[str, dict[str, dict[str, Any]]] = {}
    for lado, fuente in (("numerador", reporte.numerador), ("denominador", reporte.denominador)):
        if isinstance(fuente, FuenteArchivosFTP):
            for codigo, detalle in fuente.archivo.items():
                detalles_por_prefijo.setdefault(codigo_base(codigo), {})[f"{lado}::{codigo}"] = detalle

    # 2. Leer cada reporte en las carpetas de las unidades
    if detalles_por_prefijo:
        ftp = conectar_ftp()
        if not ftp:
            return extraidos, {"CONEXION": ErrorExtraccion(nombreError="Error FTP", descripcionError="Fallo de conexión")}
        try:
            for prefijo, detalles in detalles_por_prefijo.items():
                valores_por_unidad = extraer_reporte_de_unidades(
                    ftp, prefijo, ano, mes, semana, detalles, mapeo.marcadores_por_mes(),
                    mapeo.unidadesSinServicio or [], log,
                )
                for unidad, valores_por_llave in valores_por_unidad.items():
                    for llave in detalles:
                        lado, codigo = llave.split("::", 1)
                        valores = valores_por_llave[llave] if valores_por_llave else None
                        if lado == "numerador":
                            extraidos[unidad].numerador[codigo] = valores
                        else:
                            extraidos[unidad].denominador[codigo] = valores
        finally:
            desconectar_ftp(ftp)

    # 3. Denominador de poblacion, si el mapeo lo pide
    if isinstance(reporte.denominador, FuentePoblacionInfoSalud):
        for unidad, grupo, mensaje in extraer_poblacion(reporte.denominador.sexo, ano, extraidos):
            registrar_error(log, "PB_JSON_ERROR", unidad, grupo, mensaje)

    # 4. Solo los tipos de error que tuvieron alguna unidad afectada
    return extraidos, {id_error: error for id_error, error in log.items() if error.unidades}
