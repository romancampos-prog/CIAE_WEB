"""
Consultar lo que ya se extrajo del FTP (BD_CIAE/EPIDEMIOLOGIA/FTP/) para mostrarlo en pantalla,
sin volver a conectarse al FTP. Hay un solo archivo por mes: el ultimo previo extraido o, en
cuanto llega, el definitivo (su "semana" dice cual es).
Usado en: Controller/epiFTP.py
"""
from fastapi import HTTPException

from epidemiologia.datos.ftp.claves_up_Datos import claves_up, colores_claves
from epidemiologia.datos.ftp.estatus_acciones_Datos import catalogo_estatus, leer_estatus
from epidemiologia.datos.ftp.estudios_acciones_Datos import leer_indice_estudios
from .sincronizar_estudios_Services import sincronizar_estudios
from epidemiologia.datos.ftp.extracciones_ftp_Datos import leer_extraccion
from epidemiologia.modulos.ftp.errores_por_tipo import errores_por_tipo
from epidemiologia.modulos.ftp.estadisticas_extraccion import estadisticas_de_filas
from epidemiologia.modulos.ftp.id_registro import id_de_registro
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
    # Como se muestran las columnas en la tabla (del mapeo), ej. "Numero Seguridad Social" -> "NSS"
    contenido["etiquetasColumna"] = mapeo.etiquetasColumna
    contenido["iconosColumna"] = mapeo.iconosColumna
    contenido["filtrosMapeo"] = [{"columna": columna, "valores": valores} for columna, valores in columnas_conteo.items()]

    #6- Que significa cada clave UP del filtro (del catalogo de claves UP) y su color en pantalla
    catalogo = claves_up()
    colores = colores_claves()
    contenido["descripcionClaves"] = {
        valor: {
            "descripcion": catalogo[valor]["descripcion"],
            "subgrupo": catalogo[valor]["subgrupo"] or catalogo[valor]["grupo"],
            "color": colores.get(valor),
        }
        for valores in columnas_conteo.values() for valor in valores if valor in catalogo
    }

    #7- Estatus de seguimiento de cada registro: su "_id" y lo que ya se marco (si no, el inicial del catalogo)
    catalogo = catalogo_estatus()
    marcados = leer_estatus(archivo)
    for fila in contenido["filas"]:
        fila["_id"] = id_de_registro(fila)
    contenido["estatus"] = {fila["_id"]: marcados.get(fila["_id"], catalogo["inicial"]) for fila in contenido["filas"]}
    contenido["catalogoEstatus"] = catalogo["estatus"]

    #8- Los registros que ya tienen estudio (solo el admin los ve y los baja). Antes, el indice se
    #   pone al dia con la carpeta: alguien pudo poner o quitar Excel a mano.
    sincronizacion = sincronizar_estudios(archivo) if ver_errores else {"sinRegistro": []}
    contenido["estudiosSinRegistro"] = sincronizacion["sinRegistro"]
    estudios = leer_indice_estudios(archivo) if ver_errores else {}
    contenido["estudios"] = {fila["_id"]: estudios[fila["_id"]] for fila in contenido["filas"] if fila["_id"] in estudios}

    tipo = "definitivo" if contenido["semana"] is None else f"previo semana {contenido['semana']}"
    mensaje = f"{archivo} {ano}-{mes_texto} ({tipo}): {len(contenido['filas'])} filas."
    return mensaje, contenido
