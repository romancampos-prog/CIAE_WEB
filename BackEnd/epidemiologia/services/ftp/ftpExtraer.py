"""
Extraccion de epidemiologia desde el FTP: con el mapeo (mapeo/ftp/{archivo}.json) baja cada
reporte SIAIS de las 46 unidades, le aplica su modoExtraccion, junta las filas y las guarda en
BD_CIAE. Un fallo en una unidad no detiene a las demas (queda en 'errores').
Usado en: Controller/epiFTP.py
"""
from ftplib import FTP

import pandas as pd
from fastapi import HTTPException

from compartido.ftp_imss.conexion_ftp_Datos import conectar_ftp, desconectar_ftp
from compartido.ftp_imss.catalogo_reportes_ftp_Datos import RUTAS
from compartido.ftp_imss.navegacion_ftp_Datos import descargar_archivo, navegar_alguna_ruta, navegar_ruta
from compartido.ftp_imss.reportes_siais_ftp_Datos import listar_reportes, rutas_de_la_unidad
from epidemiologia.datos.ftp.extracciones_ftp_Datos import guardar_extraccion
from epidemiologia.modulos.ftp.filtro_seleccion import filtro_seleccion
from epidemiologia.schemas.model.accionesAchivo_Dto import Archivo
from indicadores.shared.UNIDADES import NOMBREUNIDADESARCHIVO, UNIDADES_FINALES, UNIDADES_PREVIOS
from ..mapeo.mapeo_Services import ExtraerMapeoFTP

# modoExtraccion del mapeo -> la funcion que lo hace; un modo nuevo = una linea aqui
MODOS_EXTRACCION = {
    "FILTRO_SELECCION": filtro_seleccion,
}


class _FalloUnidad(Exception):
    """Una unidad que no se pudo leer: su tipo del catalogo de errores FTP y el detalle (ruta o mensaje)."""

    def __init__(self, tipo: str, detalle: str):
        super().__init__(detalle)
        self.tipo = tipo
        self.detalle = detalle


##--------------------------------------


def ftp_Extraer_Epidemeologia(ano: int, mes: int, semana: int | None, archivo: str) -> tuple[str, dict]:

    #1- Obtener mapeo del archivo
    mapeo = ExtraerMapeoFTP(archivo)
    mes_texto = f"{mes:02d}"

    #2- Revisar que cada modoExtraccion exista antes de conectarse
    for reporte, config in mapeo.archivo.items():
        if config.modoExtraccion not in MODOS_EXTRACCION:
            raise HTTPException(400, f"{reporte}: modoExtraccion '{config.modoExtraccion}' sin implementacion.")

    #3- Bajar cada reporte de cada unidad y extraer sus filas
    ftp = conectar_ftp()
    if ftp is None:
        raise HTTPException(503, "No se pudo conectar al FTP.")

    filas: list[dict] = []
    errores: list[dict] = []
    sin_resultados: list[str] = []

    try:
        # Se recorren las carpetas de unidad que existen ese mes en el FTP: la que no tiene carpeta no se agrega
        carpetas = _carpetas_de_unidades(ftp, ano, mes_texto, semana)
        # el semanal vive en otra carpeta por unidad (ArchsData_Previos)
        unidades_ruta = UNIDADES_PREVIOS if semana is not None else UNIDADES_FINALES
        nombre_por_carpeta = dict(zip(unidades_ruta, NOMBREUNIDADESARCHIVO))

        for reporte, config in mapeo.archivo.items():
            for unidad_ruta in carpetas:
                # Fuera del catalogo de unidades: el nombre de la carpeta sin la clave (ej. "11080401 HGZ 04" -> "HGZ 04")
                unidad = nombre_por_carpeta.get(unidad_ruta) or unidad_ruta.split(" ", 1)[-1]
                # tipo = id de compartido/ftp_imss/catalogo_errores_ftp.py: la consulta los agrupa por tipo
                try:
                    filas_unidad = _filas_de_la_unidad(ftp, reporte, config, ano, mes_texto, semana, unidad_ruta)
                    filas += [{"Unidad": unidad, **fila} for fila in filas_unidad]
                    if not filas_unidad:
                        sin_resultados.append(unidad)
                except _FalloUnidad as fallo:
                    errores.append({"tipo": fallo.tipo, "unidad": unidad, "reporte": reporte, "detalle": fallo.detalle})
                except Exception as error:
                    errores.append({"tipo": "DESCARGA_FALLIDA", "unidad": unidad, "reporte": reporte, "detalle": str(error)})
    finally:
        desconectar_ftp(ftp)

    #4- Guardar en BD_CIAE y regresar
    # unidadesSinResultados: se leyeron bien pero no traen ninguna fila que cumpla el filtro (no es error)
    contenido = {
        "extraccion": archivo, "ano": ano, "mes": mes_texto, "semana": semana,
        "filas": filas, "errores": errores, "unidadesSinResultados": sin_resultados,
    }
    guardar_extraccion(archivo, ano, mes_texto, semana, contenido)

    duplicadas = {error["unidad"] for error in errores if error["tipo"] == "ARCHIVO_DUPLICADO_OMITIDO"}
    con_error  = {error["unidad"] for error in errores} - duplicadas
    mensaje = (f"{archivo}: {len(carpetas)} unidades en el FTP, {len(filas)} filas extraidas, {len(sin_resultados)} sin resultados, "
               f"{len(con_error)} con error, {len(duplicadas)} sin extraer por archivo duplicado.")
    return mensaje, contenido


##--------------------------------------

def _carpetas_de_unidades(ftp: FTP, ano: int, mes: str, semana: int | None) -> list[str]:
    """Las carpetas de unidad del mes en el FTP (la parte de la plantilla de ruta antes de {unidad})."""

    plantilla = RUTAS["semanal" if semana is not None else "definitivo"]
    carpeta_mes = plantilla.split("/{unidad}")[0].format(anio=ano, mes=mes)

    navegacion = navegar_ruta(ftp, carpeta_mes)
    if not navegacion.ok:
        raise HTTPException(404, f"No existe en el FTP la carpeta del mes: {carpeta_mes} (fallo en '{navegacion.segmento_fallido}').")

    return sorted(ftp.nlst())


##--------------------------------------

def _filas_de_la_unidad(ftp: FTP, reporte: str, config: Archivo, ano: int, mes: str, semana: int | None, unidad_ruta: str) -> list[dict]:
    """
    Navega a la carpeta de la unidad, baja el reporte y aplica el modo a cada hoja pedida. Lo que
    impide leer la unidad se lanza como _FalloUnidad con su tipo del catalogo de errores FTP.
    """

    carpeta, navegacion = navegar_alguna_ruta(ftp, rutas_de_la_unidad(reporte, str(ano), mes, unidad_ruta, semana))
    if not navegacion.ok:
        raise _FalloUnidad("RUTA_INVALIDA", f"{carpeta}  ✗ fallo en: '{navegacion.segmento_fallido}' — {navegacion.diagnostico}")

    archivos = listar_reportes(ftp, reporte)
    if not archivos:
        raise _FalloUnidad("ARCHIVO_NO_ENCONTRADO", carpeta)

    # Con duplicado no se adivina cual es el bueno: se reporta para que lo corrijan en el FTP
    if len(archivos) > 1:
        raise _FalloUnidad("ARCHIVO_DUPLICADO_OMITIDO", f"{carpeta} · {len(archivos)} archivos: {', '.join(archivos)}")
    archivo = archivos[0]

    try:
        buffer = descargar_archivo(ftp, archivo)
    except Exception as error:
        raise _FalloUnidad("DESCARGA_FALLIDA", f"{carpeta}/{archivo} · {error}")

    # "*" = todas las hojas (el OC30 reparte las filas en List_Accs_1..N); dtype=str para no perder ceros del NSS
    hojas = None if not config.hoja or "*" in config.hoja else config.hoja
    try:
        libro = pd.read_excel(buffer, sheet_name=hojas, header=None, dtype=str)
    except ValueError as error:
        raise _FalloUnidad("HOJA_NO_ENCONTRADA", f"{carpeta}/{archivo} · {error}")
    except Exception as error:
        raise _FalloUnidad("ARCHIVO_VACIO", f"{carpeta}/{archivo} · No se pudo leer el archivo: {error}")

    # Una hoja que no llega a la fila del encabezado no trae datos (ej. hoja extra vacia); si ninguna llega, el reporte viene vacio
    hojas_con_datos = {nombre: df for nombre, df in libro.items() if df.shape[0] >= config.encabezado}
    if not hojas_con_datos:
        raise _FalloUnidad("ARCHIVO_VACIO", f"{carpeta}/{archivo} · ninguna hoja llega a la fila de encabezado {config.encabezado}")

    extraer = MODOS_EXTRACCION[config.modoExtraccion]
    filas: list[dict] = []

    for nombre_hoja, df in hojas_con_datos.items():
        try:
            filas += extraer(df, config)
        except ValueError as error:
            # el modo valida los encabezados del mapeo contra la hoja
            raise _FalloUnidad("ENCABEZADO_DISTINTO", f"{carpeta}/{archivo} · Hoja {nombre_hoja}: {error}")

    return filas
