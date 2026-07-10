"""
Versión con caché en memoria de ftp_extraer — evita descargar el mismo archivo dos veces en una petición.
Usado en: ftp/services/ (disponible para uso futuro con caché)
"""
import io
import threading
import pandas as pd
from ftp.config import (
    UNIDADES_FINALES, UNIDADES_PREVIOS, CLAVE_UNIDADES, NOMBREUNIDADESARCHIVO
)
from ftp.services.ftp_conectar import conectar_ftp, desconectar_ftp
from ftp.services.ftp_extraer  import ExtraerDatosDelExcel, ExtraerPBDesdeJSON, registrar_error


def _log_errores_inicial():
    return {
        "RUTA_INVALIDA":           {"nombreError": "Ruta de acceso incorrecta",      "descripcionError": "La carpeta en el FTP no existe o está mal nombrada.", "unidades": {}},
        "ARCHIVO_NO_ENCONTRADO":   {"nombreError": "Archivo no encontrado",           "descripcionError": "El archivo no se encontró en la ubicación esperada.", "unidades": {}},
        "ARCHIVO_DUPLICADO":       {"nombreError": "Archivo duplicado",               "descripcionError": "Se encontró más de un archivo con el mismo prefijo. Se usó el primero encontrado.", "unidades": {}},
        "HOJA_NO_ENCONTRADA":      {"nombreError": "Pestaña faltante",                "descripcionError": "El archivo existe pero no contiene la hoja especificada.", "unidades": {}},
        "ETIQUETA_NO_ENCONTRADA":  {"nombreError": "Etiqueta no encontrada en Excel", "descripcionError": "El texto que se buscaba como etiqueta de fila no existe en esa columna de la hoja indicada.", "unidades": {}},
        "ARCHIVO_VACIO":           {"nombreError": "Archivo sin datos numéricos",     "descripcionError": "El archivo existe y la hoja fue leída, pero las celdas de datos están vacías o no son numéricas.", "unidades": {}},
        "VALOR_NULO":              {"nombreError": "Celda sin dato",                  "descripcionError": "El archivo tiene datos pero alguna celda específica está vacía o no es numérica. Se usó 0 en su lugar.", "unidades": {}},
        "DESCARGA_FALLIDA":        {"nombreError": "Error al descargar archivo",      "descripcionError": "El archivo existe en el FTP pero no pudo descargarse (error de red, permisos o archivo corrupto).", "unidades": {}},
        "PB_JSON_ERROR":           {"nombreError": "Error en población JSON",         "descripcionError": "La unidad o columna solicitada no existe en POBLACION.json.", "unidades": {}},
    }


def _descargar_o_cache(ftp, carpeta_remota: str, archivo: str,
                       file_cache: dict, cache_lock: threading.Lock) -> io.BytesIO | None:
    key = (carpeta_remota, archivo)

    with cache_lock:
        cached = file_cache.get(key)
    if cached is not None:
        return io.BytesIO(cached)

    buf = io.BytesIO()
    try:
        ftp.retrbinary(f"RETR {archivo}", buf.write, blocksize=65536)
    except Exception:
        return None

    data = buf.getvalue()
    with cache_lock:
        if key not in file_cache:
            file_cache[key] = data
    return io.BytesIO(data)


def _procesar_ftp_con_cache(ftp, repo, ano, mes, semana, infoReporte,
                             diccionarioGlobal, logErrores, subcarpeta_base,
                             meses_mapeo, file_cache, cache_lock):
    unidades_ruta   = UNIDADES_PREVIOS if semana is not None else UNIDADES_FINALES
    nombres_destino = list(diccionarioGlobal.keys())

    for i, unidad_ruta in enumerate(unidades_ruta):
        nombre_final = nombres_destino[i]
        s_val = str(semana) if semana else ""

        if semana is None:
            carpeta_remota = f"01. DATAMARTEM/ArchsDataMart_{ano}/{ano}{mes}/{unidad_ruta}/1.SIAIS_Reportes/{subcarpeta_base}"
        else:
            carpeta_remota = f"01. DATAMARTEM/ArchsData_Previos_{ano}/{ano}{mes}/{unidad_ruta}/1.SIAIS_Reportes/Semana_{s_val}/{subcarpeta_base}_S{s_val}"

        try:
            ftp.cwd('/')
            try:
                ftp.cwd(carpeta_remota)
            except Exception:
                registrar_error(logErrores, "RUTA_INVALIDA", nombre_final, repo, carpeta_remota)
                diccionarioGlobal[nombre_final][repo] = None
                continue

            archivos = ftp.nlst()
            repo_busqueda = repo.split("_")[0]

            archivos_filtrados = [
                f for f in archivos
                if f.upper().strip().startswith(repo_busqueda.upper()) and f.upper().endswith((".XLS", ".XLSX"))
            ]

            if len(archivos_filtrados) > 1:
                registrar_error(logErrores, "ARCHIVO_DUPLICADO", nombre_final, repo, carpeta_remota)

            archivo_encontrado = archivos_filtrados[0] if archivos_filtrados else None

            if archivo_encontrado:
                stream = _descargar_o_cache(ftp, carpeta_remota, archivo_encontrado, file_cache, cache_lock)
                if stream is None:
                    registrar_error(logErrores, "DESCARGA_FALLIDA", nombre_final, repo, carpeta_remota)
                    diccionarioGlobal[nombre_final][repo] = None
                    continue
                datos, id_falla, detalle_falla = ExtraerDatosDelExcel(stream, infoReporte, mes, meses_mapeo)
                diccionarioGlobal[nombre_final][repo] = datos
                if id_falla:
                    ruta_log = detalle_falla if detalle_falla else carpeta_remota
                    registrar_error(logErrores, id_falla, nombre_final, repo, ruta_log)
            else:
                diccionarioGlobal[nombre_final][repo] = None
                registrar_error(logErrores, "ARCHIVO_NO_ENCONTRADO", nombre_final, repo, carpeta_remota)

        except Exception as exc:
            registrar_error(logErrores, "DESCARGA_FALLIDA", nombre_final, repo, f"{carpeta_remota} · {exc}")
            diccionarioGlobal[nombre_final][repo] = None


def _extraer_pb_con_cache(ftp, repo, ano, infoReporte, diccionarioGlobal,
                           logErrores, meses_mapeo, file_cache, cache_lock):
    carpeta_pb      = f"01. DATAMARTEM/ArchsDataMart_{ano}/Piramides para {ano} por unidades"
    nombres_destino = list(diccionarioGlobal.keys())

    for i, pb_clave in enumerate(CLAVE_UNIDADES):
        prefijo_busqueda = f"{repo}U{pb_clave}".upper()
        nombre_final     = nombres_destino[i]

        try:
            ftp.cwd('/')
            try:
                ftp.cwd(carpeta_pb)
            except Exception:
                registrar_error(logErrores, "RUTA_INVALIDA", nombre_final, repo, carpeta_pb)
                continue

            archivos = ftp.nlst()
            archivo_encontrado = next(
                (f for f in archivos
                 if f.upper().startswith(prefijo_busqueda) and f.upper().endswith((".XLS", ".XLSX"))),
                None
            )

            if archivo_encontrado:
                stream = _descargar_o_cache(ftp, carpeta_pb, archivo_encontrado, file_cache, cache_lock)
                if stream is None:
                    diccionarioGlobal[nombre_final][repo] = None
                    registrar_error(logErrores, "DESCARGA_FALLIDA", nombre_final, repo, carpeta_pb)
                    continue
                datos_pb, id_falla, detalle_falla = ExtraerDatosDelExcel(stream, infoReporte, None, meses_mapeo)
                diccionarioGlobal[nombre_final][repo] = datos_pb
                if id_falla:
                    ruta_log = detalle_falla if detalle_falla else carpeta_pb
                    registrar_error(logErrores, id_falla, nombre_final, repo, ruta_log)
            else:
                diccionarioGlobal[nombre_final][repo] = None
                registrar_error(logErrores, "ARCHIVO_NO_ENCONTRADO", nombre_final, repo, carpeta_pb)

        except Exception as exc:
            registrar_error(logErrores, "DESCARGA_FALLIDA", nombre_final, repo, f"{carpeta_pb} · {exc}")
            diccionarioGlobal[nombre_final][repo] = None


def ExtraerInformacionPreviaConCache(informacionReportes, ano, mes, semana,
                                     meses_mapeo, file_cache: dict, cache_lock: threading.Lock):
    if not isinstance(informacionReportes, dict):
        return {}, {}

    diccionarioPrevio = {nombre: {} for nombre in NOMBREUNIDADESARCHIVO}
    logErrores        = _log_errores_inicial()

    ftp = conectar_ftp()
    if not ftp:
        return diccionarioPrevio, {
            "CONEXION": {"nombreError": "Error FTP", "descripcionError": "Fallo de conexión", "unidades": {}}
        }

    try:
        for repo, infoRepo in informacionReportes.items():
            if infoRepo.get('modo') == 'JSON_POBLACION':
                ExtraerPBDesdeJSON(repo, infoRepo, diccionarioPrevio)
                continue

            prefRepor = repo[:2]
            if prefRepor in ["CP", "CI", "IA"]:
                _procesar_ftp_con_cache(ftp, repo, ano, mes, semana, infoRepo, diccionarioPrevio, logErrores, "Salud Pública",  meses_mapeo, file_cache, cache_lock)
            elif prefRepor == "PB":
                _extraer_pb_con_cache(ftp, repo, ano, infoRepo, diccionarioPrevio, logErrores, meses_mapeo, file_cache, cache_lock)
            elif prefRepor == "IN":
                _procesar_ftp_con_cache(ftp, repo, ano, mes, semana, infoRepo, diccionarioPrevio, logErrores, "Indicadores",   meses_mapeo, file_cache, cache_lock)
            elif prefRepor == "MT":
                _procesar_ftp_con_cache(ftp, repo, ano, mes, semana, infoRepo, diccionarioPrevio, logErrores, "Salud Materna", meses_mapeo, file_cache, cache_lock)
            elif prefRepor == "PU":
                _procesar_ftp_con_cache(ftp, repo, ano, mes, semana, infoRepo, diccionarioPrevio, logErrores, "Productividad", meses_mapeo, file_cache, cache_lock)

        logFinal = {k: v for k, v in logErrores.items() if v["unidades"]}
        return diccionarioPrevio, logFinal
    finally:
        desconectar_ftp(ftp)
