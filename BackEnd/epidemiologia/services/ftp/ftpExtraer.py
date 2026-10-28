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
from compartido.ftp_imss.navegacion_ftp_Datos import descargar_archivo, navegar_alguna_ruta
from compartido.ftp_imss.reportes_siais_ftp_Datos import elegir_archivo_del_periodo, listar_reportes, rutas_de_la_unidad
from epidemiologia.datos.ftp.extracciones_ftp_Datos import guardar_extraccion
from epidemiologia.modulos.ftp.filtro_seleccion import filtro_seleccion
from epidemiologia.schemas.model.accionesAchivo_Dto import Archivo
from indicadores.shared.UNIDADES import NOMBREUNIDADESARCHIVO, UNIDADES_FINALES, UNIDADES_PREVIOS
from ..mapeo.mapeo_Services import ExtraerMapeoFTP

# modoExtraccion del mapeo -> la funcion que lo hace; un modo nuevo = una linea aqui
MODOS_EXTRACCION = {
    "FILTRO_SELECCION": filtro_seleccion,
}


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

    # el semanal vive en otra carpeta por unidad (ArchsData_Previos)
    unidades_ruta = UNIDADES_PREVIOS if semana is not None else UNIDADES_FINALES
    filas: list[dict] = []
    errores: list[dict] = []

    try:
        for reporte, config in mapeo.archivo.items():
            for unidad_ruta, unidad in zip(unidades_ruta, NOMBREUNIDADESARCHIVO):
                try:
                    filas_unidad = _filas_de_la_unidad(ftp, reporte, config, ano, mes_texto, semana, unidad_ruta)
                    filas += [{"Unidad": unidad, **fila} for fila in filas_unidad]
                except Exception as error:
                    errores.append({"unidad": unidad, "reporte": reporte, "error": str(error)})
    finally:
        desconectar_ftp(ftp)

    #4- Guardar en BD_CIAE y regresar
    contenido = {"extraccion": archivo, "ano": ano, "mes": mes_texto, "semana": semana, "filas": filas, "errores": errores}
    guardar_extraccion(archivo, ano, mes_texto, semana, contenido)

    mensaje = f"{archivo}: {len(filas)} filas extraidas, {len(errores)} unidades con error."
    return mensaje, contenido


##--------------------------------------

def _filas_de_la_unidad(ftp: FTP, reporte: str, config: Archivo, ano: int, mes: str, semana: int | None, unidad_ruta: str) -> list[dict]:
    """Navega a la carpeta de la unidad, baja el reporte del periodo y aplica el modo a cada hoja pedida."""

    carpeta, navegacion = navegar_alguna_ruta(ftp, rutas_de_la_unidad(reporte, str(ano), mes, unidad_ruta, semana))
    if not navegacion.ok:
        raise ValueError(f"{carpeta} · fallo en '{navegacion.segmento_fallido}' — {navegacion.diagnostico}")

    archivos = listar_reportes(ftp, reporte)
    if not archivos:
        raise ValueError(f"No esta el {reporte} en {carpeta}")

    buffer = descargar_archivo(ftp, elegir_archivo_del_periodo(archivos, str(ano), mes))

    # "*" = todas las hojas (el OC30 reparte las filas en List_Accs_1..N); dtype=str para no perder ceros del NSS
    hojas = None if not config.hoja or "*" in config.hoja else config.hoja
    libro = pd.read_excel(buffer, sheet_name=hojas, header=None, dtype=str)

    extraer = MODOS_EXTRACCION[config.modoExtraccion]
    filas: list[dict] = []

    for df in libro.values():
        filas += extraer(df, config)

    return filas
