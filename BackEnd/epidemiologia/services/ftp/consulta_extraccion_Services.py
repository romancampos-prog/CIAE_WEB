"""
Consultar lo que ya se extrajo del FTP (BD_CIAE/EPIDEMIOLOGIA/FTP/) para mostrarlo en pantalla,
sin volver a conectarse al FTP. Hay un solo archivo por mes: el ultimo previo extraido o, en
cuanto llega, el definitivo (su "semana" dice cual es).
Usado en: Controller/epiFTP.py
"""
from fastapi import HTTPException

from epidemiologia.datos.ftp.claves_up_Datos import claves_up
from epidemiologia.datos.ftp.extracciones_ftp_Datos import leer_extraccion
from epidemiologia.modulos.ftp.errores_por_tipo import errores_por_tipo
from epidemiologia.modulos.ftp.estadisticas_extraccion import estadisticas_de_filas
from ..mapeo.mapeo_Services import ExtraerMapeoFTP


def consultar_extraccion(ano: int, mes: int, archivo: str, unidades_usuario: list[str] | None, ver_errores: bool) -> tuple[str, dict]:
    """
    @param unidades_usuario - nombres de la unidad de un usuario de unidad (del token); None = todas
    @param ver_errores      - solo el admin ve las unidades que fallaron en la extraccion
    """

    #1- Lo guardado del mes (previo o definitivo)
    mes_texto = f"{mes:02d}"
    contenido = leer_extraccion(archivo, ano, mes_texto)

    if contenido is None:
        raise HTTPException(404, f"{archivo}: no hay extraccion guardada de {ano}-{mes_texto}.")

    #2- Usuario de unidad: solo sus filas (las extracciones viejas no traen unidadesSinResultados)
    contenido.setdefault("unidadesSinResultados", [])
    if unidades_usuario is not None:
        contenido["filas"] = [fila for fila in contenido["filas"] if fila.get("Unidad") in unidades_usuario]
        contenido["unidadesSinResultados"] = [u for u in contenido["unidadesSinResultados"] if u in unidades_usuario]

    #3- Los errores de la extraccion solo los ve el admin, agrupados por tipo (como en indicadores FTP)
    contenido["errores"] = errores_por_tipo(contenido["errores"]) if ver_errores else {}

    #4- Estadisticas por las columnas del filtro del mapeo (ej. Clave de la Accion) y por unidad
    mapeo = ExtraerMapeoFTP(archivo)
    # {columna: valores del filtro}: se cuentan todos, tambien los que no trajeron filas
    columnas_conteo = {
        filtro.nombreColumna: filtro.filtro
        for config in mapeo.archivo.values() for filtro in config.filtroColumna.values() if filtro.nombreColumna
    }
    contenido["estadisticas"] = estadisticas_de_filas(contenido["filas"], columnas_conteo, contenido["unidadesSinResultados"])

    #5- Lo que filtra el mapeo (ej. Clave de la Accion: UP87, UP407...), para decirlo en pantalla
    contenido["filtrosMapeo"] = [{"columna": columna, "valores": valores} for columna, valores in columnas_conteo.items()]

    #6- Que significa cada clave UP del filtro (del catalogo de claves UP), para mostrarlo junto al codigo
    catalogo = claves_up()
    contenido["descripcionClaves"] = {
        valor: {"descripcion": catalogo[valor]["descripcion"], "subgrupo": catalogo[valor]["subgrupo"] or catalogo[valor]["grupo"]}
        for valores in columnas_conteo.values() for valor in valores if valor in catalogo
    }

    tipo = "definitivo" if contenido["semana"] is None else f"previo semana {contenido['semana']}"
    mensaje = f"{archivo} {ano}-{mes_texto} ({tipo}): {len(contenido['filas'])} filas."
    return mensaje, contenido
