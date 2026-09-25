"""
Extraccion de los datos de un indicador de FTP (exclusivo de FTP): recorre los
reportes que pide el mapeo en las carpetas de las 46 unidades y, si el denominador
sale de la poblacion, lo lee de POBLACION_{año}.json. No calcula nada: entrega lo leido.
Usado en: services/ftp/generacion_indicador_ftp_Services.py, ftp/services/recalcular_poblacion_service.py
"""
import json
from ftplib import FTP
from typing import Any

from shared.unidades_ftp import NOMBREUNIDADESARCHIVO, UNIDADES_FINALES, UNIDADES_PREVIOS, ruta_poblacion
from schemas.model.generacion_ftp_Model import DatosExtraidosUnidad, LogErrores
from schemas.model.reporte_mapeo_Model import FuenteArchivosFTP, FuentePoblacionInfoSalud, IndicadorFTPMapeo
from services.indicadorMapeo_Services import cargar_indicador_mapeo
from services.ftp.conexion_ftp_Services import conectar_ftp, desconectar_ftp
from services.ftp.lectura_reporte_ftp_Services import extraer_lados_del_excel
from services.ftp.catalogo_reportes_ftp_Services import subcarpeta_de_reporte
from services.ftp.navegacion_ftp_Services import (
    descargar_archivo, listar_reportes, navegar_ruta, ruta_reportes_unidad,
)
from services.ftp.registro_errores_ftp_Services import (
    crear_log_errores, error_de_conexion, registrar_error, solo_con_errores,
)


def extraer_reporte_de_unidades(
    ftp: FTP, reporte: str, ano: str, mes: str, semana: int | None,
    detalles_por_lado: dict[str, dict[str, Any]], meses_cip01: dict[str, str],
    unidades_sin_servicio: list[str], log: LogErrores,
) -> dict[str, dict[str, list[float] | None] | None]:
    """
    Lee un reporte en la carpeta de cada unidad. Regresa {unidad: valores por lado, o None si no
    se pudo}; un fallo en una unidad no detiene a las demas (queda None y se registra).
    """
    unidades_ruta = UNIDADES_PREVIOS if semana is not None else UNIDADES_FINALES
    subcarpeta    = subcarpeta_de_reporte(reporte)
    valores_por_unidad: dict[str, dict[str, list[float] | None] | None] = {}

    for unidad_ruta, unidad in zip(unidades_ruta, NOMBREUNIDADESARCHIVO):
        carpeta = ruta_reportes_unidad(ano, mes, unidad_ruta, subcarpeta, semana)
        try:
            navegacion = navegar_ruta(ftp, carpeta)
            if not navegacion.ok:
                registrar_error(log, "RUTA_INVALIDA", unidad, reporte,
                                f"{carpeta}  ✗ fallo en: '{navegacion.segmento_fallido}' — {navegacion.diagnostico}")
                valores_por_unidad[unidad] = None
                continue

            archivos = listar_reportes(ftp, reporte)
            if len(archivos) > 1:
                registrar_error(log, "ARCHIVO_DUPLICADO", unidad, reporte, carpeta)
            if not archivos:
                registrar_error(log, "ARCHIVO_NO_ENCONTRADO", unidad, reporte, carpeta)
                valores_por_unidad[unidad] = None
                continue

            lectura = extraer_lados_del_excel(descargar_archivo(ftp, archivos[0]), detalles_por_lado, mes, meses_cip01)
            valores_por_unidad[unidad] = lectura.valores_por_lado
            if lectura.id_error:
                # Si la unidad no maneja ese servicio, la etiqueta faltante es esperada, no una falla.
                id_error = lectura.id_error
                if id_error == "ETIQUETA_NO_ENCONTRADA" and unidad in unidades_sin_servicio:
                    id_error = "SERVICIO_NO_APLICA"
                registrar_error(log, id_error, unidad, reporte, lectura.mensaje or carpeta)
        except Exception as error:
            registrar_error(log, "DESCARGA_FALLIDA", unidad, reporte, f"{carpeta} · {error}")
            valores_por_unidad[unidad] = None

    return valores_por_unidad


def extraer_poblacion(
    sexo: dict[str, list[str]], ano: str, extraidos: dict[str, DatosExtraidosUnidad], log: LogErrores,
) -> None:
    """Llena extraidos[unidad].denominador[grupo] con los valores por columna de POBLACION_{año}.json."""
    ruta = ruta_poblacion(ano)
    try:
        poblacion = json.loads(ruta.read_text(encoding="utf-8")).get("POBLACION", {})
    except FileNotFoundError:
        for unidad, datos in extraidos.items():
            registrar_error(log, "PB_JSON_ERROR", unidad, "poblacion", f"No existe {ruta}")
            for grupo in sexo:
                datos.denominador[grupo] = None
        return

    for unidad, datos in extraidos.items():
        for grupo, columnas in sexo.items():
            try:
                datos.denominador[grupo] = [float(poblacion[unidad][grupo][columna]) for columna in columnas]
            except KeyError as error:
                registrar_error(log, "PB_JSON_ERROR", unidad, grupo, f"No existe {error} en POBLACION")
                datos.denominador[grupo] = None


def extraer_indicador(
    indicador: str, ano: str, mes: str, semana: int | None, mapeo: IndicadorFTPMapeo | None = None,
) -> tuple[dict[str, DatosExtraidosUnidad], LogErrores]:
    """Regresa (lo leido por unidad, errores encontrados)."""
    mapeo   = mapeo or cargar_indicador_mapeo(indicador)
    reporte = mapeo.reporte

    extraidos = {unidad: DatosExtraidosUnidad() for unidad in NOMBREUNIDADESARCHIVO}
    log       = crear_log_errores()

    detalles_por_reporte: dict[str, dict[str, dict[str, Any]]] = {}
    for lado in ("numerador", "denominador"):
        fuente = getattr(reporte, lado)
        if isinstance(fuente, FuenteArchivosFTP):
            for codigo, detalle in fuente.archivo.items():
                detalles_por_reporte.setdefault(codigo, {})[lado] = detalle

    if detalles_por_reporte:
        ftp = conectar_ftp()
        if not ftp:
            return extraidos, error_de_conexion()
        try:
            for codigo, detalles in detalles_por_reporte.items():
                valores_por_unidad = extraer_reporte_de_unidades(
                    ftp, codigo, ano, mes, semana, detalles, mapeo.MESES_CIP01,
                    mapeo.unidadesSinServicio or [], log,
                )
                for unidad, valores_por_lado in valores_por_unidad.items():
                    for lado in detalles:
                        getattr(extraidos[unidad], lado)[codigo] = valores_por_lado[lado] if valores_por_lado else None
        finally:
            desconectar_ftp(ftp)

    if isinstance(reporte.denominador, FuentePoblacionInfoSalud):
        extraer_poblacion(reporte.denominador.sexo, ano, extraidos, log)

    return extraidos, solo_con_errores(log)
