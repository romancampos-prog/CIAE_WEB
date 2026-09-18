"""
Extraccion de un indicador FTP leyendo el mapeo UNIFICADO (indicadores/mapeo/).
Reemplaza a ftp_extraer.ExtraerInformacionPrevia (que se conserva, sin usarse,
hasta comprobar este camino con archivos reales).

Capa 1 (bajar el archivo de cada unidad del FTP) se reusa tal cual de
ftp_extraer.procesar_extraccion_ftp; capa 2 (leer el valor del Excel segun
modoExtraccion) la hace shared/extraccion_service.py.

A diferencia del viejo, numerador y denominador se extraen por separado (un
mismo repo puede aportar columnas distintas a cada lado, ej. CUPN 07 con PU01),
asi que el resultado por unidad es {"numerador": {...}, "denominador": {...}}
-- lo evalua numerador_denominador_unificado.py.
Usado en: ftp/services/reporte_final.py, reporte_categoria.py
"""
import json
import pandas as pd

from ftp.config import NOMBREUNIDADESARCHIVO, ruta_poblacion
from ftp.services.mapeo_ftp import cargar_indicador_mapeo
from ftp.services.ftp_conectar import conectar_ftp, desconectar_ftp
from ftp.services.ftp_extraer import (
    procesar_extraccion_ftp, registrar_error, crear_log_errores, SUBCARPETA_POR_PREFIJO,
)
from schemas.model.reporte_mapeo_Model import (
    IndicadorFTPMapeo, FuenteArchivosFTP, FuentePoblacionInfoSalud,
)
from ftp.services.numerador_denominador_unificado import ObtenerNumDenUnificado
from shared.extraccion_service import extraer


def _leer_hoja(buf, hoja: str):
    buf.seek(0)
    try:
        return pd.read_excel(buf, sheet_name=hoja, header=None), None, None
    except ValueError:
        return None, "HOJA_NO_ENCONTRADA", f"Hoja '{hoja}' no encontrada en el archivo"
    except Exception as exc:
        return None, "ARCHIVO_VACIO", f"No se pudo leer el archivo: {exc}"


def _extraer_lados_del_excel(buf, detalles_por_lado: dict, mes, meses_cip01: dict):
    """
    Extractor que se inyecta al crawl de FTP: un mismo archivo baja UNA vez y
    de el se lee cada lado (numerador/denominador) que pida ese repo.
    Regresa ({lado: valores}, id_error, mensaje) -- si varios lados fallan, se
    reporta el primer error (el crawl registra un solo error por repo/unidad).
    """
    valores_por_lado, primer_error = {}, (None, None)
    hojas: dict[str, tuple] = {}

    for lado, detalle in detalles_por_lado.items():
        hoja = detalle["hoja"]
        if hoja not in hojas:
            hojas[hoja] = _leer_hoja(buf, hoja)
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

    if all(v is None for v in valores_por_lado.values()):
        return None, *primer_error
    return valores_por_lado, *primer_error


def extraer_poblacion(sexo: dict[str, list[str]], ano, previo: dict, log_errores: dict) -> None:
    """Llena previo[unidad]["denominador"][grupo] = [valores por columna] desde POBLACION_{ano}.json, buscando cada unidad por nombre."""
    ruta = ruta_poblacion(ano)
    try:
        poblacion = json.loads(ruta.read_text(encoding="utf-8")).get("POBLACION", {})
    except FileNotFoundError:
        for unidad in previo:
            registrar_error(log_errores, "PB_JSON_ERROR", unidad, "poblacion", f"No existe {ruta}")
            for grupo in sexo:
                previo[unidad]["denominador"][grupo] = None
        return

    for unidad in previo:
        for grupo, columnas in sexo.items():
            try:
                previo[unidad]["denominador"][grupo] = [float(poblacion[unidad][grupo][col]) for col in columnas]
            except KeyError as e:
                registrar_error(log_errores, "PB_JSON_ERROR", unidad, grupo, f"No existe {e} en POBLACION")
                previo[unidad]["denominador"][grupo] = None


def ExtraerInformacionPreviaUnificada(indicador: str, ano, mes, semana, mapeo: IndicadorFTPMapeo | None = None):
    """
    Equivalente a ftp_extraer.ExtraerInformacionPrevia, pero desde el mapeo
    unificado. Regresa (previo, log_errores) con
    previo = {unidad: {"numerador": {repo|grupo: valores|None}, "denominador": {...}}}.
    """
    mapeo   = mapeo or cargar_indicador_mapeo(indicador)
    reporte = mapeo.reporte

    previo      = {unidad: {"numerador": {}, "denominador": {}} for unidad in NOMBREUNIDADESARCHIVO}
    log_errores = crear_log_errores()

    detalles_por_repo: dict[str, dict] = {}
    for lado in ("numerador", "denominador"):
        fuente = getattr(reporte, lado)
        if isinstance(fuente, FuenteArchivosFTP):
            for repo, detalle in fuente.archivo.items():
                detalles_por_repo.setdefault(repo, {})[lado] = detalle

    if detalles_por_repo:
        ftp = conectar_ftp()
        if not ftp:
            return previo, {"CONEXION": {"nombreError": "Error FTP", "descripcionError": "Fallo de conexión", "unidades": {}}}
        try:
            for repo, detalles in detalles_por_repo.items():
                por_unidad = {unidad: {} for unidad in NOMBREUNIDADESARCHIVO}
                procesar_extraccion_ftp(
                    ftp, repo, ano, mes, semana, detalles, por_unidad, log_errores,
                    SUBCARPETA_POR_PREFIJO[repo[:2]], mapeo.MESES_CIP01,
                    extractor=_extraer_lados_del_excel,
                    unidades_sin_servicio_indicador=mapeo.unidadesSinServicio,
                )
                for unidad, datos_por_repo in por_unidad.items():
                    datos = datos_por_repo.get(repo)
                    for lado in detalles:
                        previo[unidad][lado][repo] = datos[lado] if datos else None
        finally:
            desconectar_ftp(ftp)

    if isinstance(reporte.denominador, FuentePoblacionInfoSalud):
        extraer_poblacion(reporte.denominador.sexo, ano, previo, log_errores)

    return previo, {k: v for k, v in log_errores.items() if v["unidades"]}


def ExtraerYCalcularIndicadorUnificado(indicador: str, ano, mes, semana):
    """
    Lo que antes eran ExtraerInformacionPrevia + ObtenerNumDen: regresa
    ({unidad: {numerador, denominador, resultado}} con TOTAL_OOAD, log_errores),
    ya con el aviso CALCULO_FALLIDO si alguna formula tronó.
    """
    mapeo = cargar_indicador_mapeo(indicador)
    previo, errores = ExtraerInformacionPreviaUnificada(indicador, ano, mes, semana, mapeo)
    resultados, errores_calculo = ObtenerNumDenUnificado(previo, mapeo.reporte.operacion)
    if errores_calculo:
        errores["CALCULO_FALLIDO"] = {
            "nombreError": "Error de cálculo",
            "descripcionError": "Falló la evaluación de la fórmula del indicador para estas unidades.",
            "unidades": {u: [{"reportes": ["cálculo"], "ruta": msg}] for u, msg in errores_calculo.items()},
        }
    return resultados, errores
