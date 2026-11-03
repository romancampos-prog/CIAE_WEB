"""
Excel de lo extraido del FTP (ej. Acciones OC30) entre dos fechas, aunque abarquen varios meses.
Cada registro se busca por su fecha (columnaFecha del mapeo) en los archivos mensuales guardados;
el usuario de unidad solo recibe sus filas. No se conecta al FTP.
Usado en: Controller/epiFTP.py
"""
import base64
from datetime import date, datetime

from fastapi import HTTPException

from epidemiologia.datos.ftp.claves_up_Datos import claves_up
from epidemiologia.datos.ftp.extracciones_ftp_Datos import leer_extraccion
from epidemiologia.modulos.ftp.libro_excel_extraccion import libro_excel_extraccion
from ..mapeo.mapeo_Services import ExtraerMapeoFTP

MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
         "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

COLUMNA_PERIODO = "Periodo"
HOJA_CLAVES = "Claves UP"


def excel_de_extraccion(desde: date, hasta: date, archivo: str, unidades_usuario: list[str] | None) -> tuple[str, dict]:
    """
    @param unidades_usuario - nombres de la unidad de un usuario de unidad (del token); None = todas
    @returns (mensaje, {archivo_b64, nombre_archivo, totalRegistros})
    """

    if desde > hasta:
        raise HTTPException(400, "La fecha inicial no puede ser posterior a la final.")

    mapeo = ExtraerMapeoFTP(archivo)
    columna_fecha = mapeo.columnaFecha

    # 1- Los meses que pueden traer fechas del rango (el mes estadistico empieza a fines del mes anterior)
    filas = []
    for ano, mes in _meses_del_rango(desde, hasta):
        contenido = leer_extraccion(archivo, ano, f"{mes:02d}")
        if contenido is None:
            continue
        periodo = f"{MESES[mes - 1]} {ano}"

        # 2- Solo las filas del rango (y de la unidad del usuario, si es de unidad)
        for fila in contenido["filas"]:
            if unidades_usuario is not None and fila.get("Unidad") not in unidades_usuario:
                continue
            fecha = _fecha_de(fila.get(columna_fecha))
            if fecha is None or not desde <= fecha <= hasta:
                continue
            filas.append({**fila, columna_fecha: fecha, COLUMNA_PERIODO: periodo})

    rango = f"{desde:%d/%m/%Y} al {hasta:%d/%m/%Y}"
    if not filas:
        raise HTTPException(404, f"{archivo}: no hay registros del {rango}.")

    # Los meses que si aportaron registros, para el mensaje
    meses_con_registros = list(dict.fromkeys(fila[COLUMNA_PERIODO] for fila in filas))

    # 3- Ordenados por fecha y unidad, con las columnas en el orden del mapeo
    filas.sort(key=lambda fila: (fila[columna_fecha], fila.get("Unidad") or ""))
    columnas = ["Unidad", *_columnas_del_mapeo(mapeo), COLUMNA_PERIODO]

    # 4- El libro: los registros y, siempre en la segunda hoja, lo que significa cada clave del filtro
    columnas_claves, filas_claves = _hoja_de_claves(mapeo, filas)
    contenido_excel = libro_excel_extraccion([(archivo, columnas, filas), (HOJA_CLAVES, columnas_claves, filas_claves)])

    datos = {
        "archivo_b64": base64.b64encode(contenido_excel).decode("ascii"),
        "nombre_archivo": f"{archivo}_{desde:%Y%m%d}_a_{hasta:%Y%m%d}.xlsx",
        "totalRegistros": len(filas),
    }
    mensaje = f"{archivo} del {rango}: {len(filas)} registros de {', '.join(meses_con_registros)}."
    return mensaje, datos


##--------------------------------------

def _meses_del_rango(desde: date, hasta: date) -> list[tuple[int, int]]:
    """(año, mes) desde el mes de "desde" hasta el siguiente al de "hasta": el 26-31 cae en el mes que sigue."""

    meses = []
    ano, mes = desde.year, desde.month
    ultimo = (hasta.year + hasta.month // 12, hasta.month % 12 + 1)

    while (ano, mes) <= ultimo:
        meses.append((ano, mes))
        ano, mes = (ano + 1, 1) if mes == 12 else (ano, mes + 1)

    return meses


##--------------------------------------

def _fecha_de(valor: str | None) -> date | None:
    """dd/mm/aaaa como llega del OC30; None si viene vacia o con otro formato."""

    try:
        return datetime.strptime(valor or "", "%d/%m/%Y").date()
    except ValueError:
        return None


##--------------------------------------

def _columnas_del_mapeo(mapeo) -> list[str]:
    """Los nombres de "seleccionar" de cada archivo del mapeo, sin repetir y en su orden."""

    columnas = []
    for config in mapeo.archivo.values():
        for nombre in config.seleccionar.values():
            if nombre not in columnas:
                columnas.append(nombre)
    return columnas


##--------------------------------------

def _hoja_de_claves(mapeo, filas: list[dict]) -> tuple[list[str], list[dict]]:
    """Cada clave del filtro del mapeo (ej. UP87...) con su significado del catalogo de claves UP y cuantos registros trae este Excel (tambien las que traen 0)."""

    catalogo = claves_up()
    columnas = ["Clave", "Descripción", "Tema", "Registros", "Se registra en", "Clave anterior"]
    renglones = []

    for config in mapeo.archivo.values():
        for filtro in config.filtroColumna.values():
            for clave in filtro.filtro or []:
                info = catalogo.get(clave, {})
                registro_en = [sistema for sistema, campo in (("RAIS", "registroRAIS"), ("SIMF", "registroSIMF")) if info.get(campo)]
                renglones.append({
                    "Clave": clave,
                    "Descripción": info.get("descripcion", "(no está en el catálogo de claves UP)"),
                    "Tema": info.get("subgrupo") or info.get("grupo"),
                    "Registros": sum(1 for fila in filas if fila.get(filtro.nombreColumna) == clave),
                    "Se registra en": " y ".join(registro_en) or None,
                    "Clave anterior": info.get("claveAnterior"),
                })

    return columnas, renglones
