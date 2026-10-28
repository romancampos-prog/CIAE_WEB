"""
Consultar lo que ya se extrajo del FTP (BD_CIAE/EPIDEMIOLOGIA/FTP/) para mostrarlo en pantalla,
sin volver a conectarse al FTP. Como en indicadores: mientras el mes no tiene definitivo se
muestra su ultima semana (previo), y el definitivo la reemplaza en cuanto se extrae.
Usado en: Controller/epiFTP.py
"""
from fastapi import HTTPException

from epidemiologia.datos.ftp.extracciones_ftp_Datos import leer_extraccion, periodos_guardados
from epidemiologia.modulos.ftp.errores_por_tipo import errores_por_tipo
from epidemiologia.modulos.ftp.estadisticas_extraccion import estadisticas_de_filas
from ..mapeo.mapeo_Services import ExtraerMapeoFTP


def consultar_extraccion(ano: int, mes: int, archivo: str, unidades_usuario: list[str] | None, ver_errores: bool) -> tuple[str, dict]:
    """
    @param unidades_usuario - nombres de la unidad de un usuario de unidad (del token); None = todas
    @param ver_errores      - solo el admin ve las unidades que fallaron en la extraccion
    """

    #1- El definitivo del mes; si no hay, su ultima semana extraida
    mes_texto = f"{mes:02d}"
    contenido = leer_extraccion(archivo, ano, mes_texto, None)

    if contenido is None:
        semanas = [semana for m, semana in periodos_guardados(archivo, ano) if m == mes_texto and semana is not None]
        contenido = leer_extraccion(archivo, ano, mes_texto, max(semanas)) if semanas else None

    if contenido is None:
        raise HTTPException(404, f"{archivo}: no hay extraccion guardada de {ano}-{mes_texto}.")

    #2- Usuario de unidad: solo sus filas
    if unidades_usuario is not None:
        contenido["filas"] = [fila for fila in contenido["filas"] if fila.get("Unidad") in unidades_usuario]

    #3- Los errores de la extraccion solo los ve el admin, agrupados por tipo (como en indicadores FTP)
    contenido["errores"] = errores_por_tipo(contenido["errores"]) if ver_errores else {}

    #4- Estadisticas por las columnas del filtro del mapeo (ej. Clave de la Accion) y por unidad
    mapeo = ExtraerMapeoFTP(archivo)
    columnas_conteo = [filtro.nombreColumna for config in mapeo.archivo.values() for filtro in config.filtroColumna.values() if filtro.nombreColumna]
    contenido["estadisticas"] = estadisticas_de_filas(contenido["filas"], list(dict.fromkeys(columnas_conteo)))

    tipo = "definitivo" if contenido["semana"] is None else f"previo semana {contenido['semana']}"
    mensaje = f"{archivo} {ano}-{mes_texto} ({tipo}): {len(contenido['filas'])} filas."
    return mensaje, contenido
