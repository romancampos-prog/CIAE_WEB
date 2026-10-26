"""
Catalogo de errores de la extraccion de FTP (las "restricciones" que el front muestra) y como
se registra una unidad/ruta afectada.
Usado en: services/ftp/extraer_*_Services.py
"""
from schemas.model.generacion_ftp_Model import LogErrores, RutaAfectada

CATALOGO_ERRORES_FTP: dict[str, tuple[str, str]] = {
    "RUTA_INVALIDA":          ("Ruta de acceso incorrecta",      "La carpeta en el FTP no existe o está mal nombrada."),
    "ARCHIVO_NO_ENCONTRADO":  ("Archivo no encontrado",          "El archivo no se encontró en la ubicación esperada."),
    "ARCHIVO_DUPLICADO":      ("Archivo duplicado",              "Se encontró más de un archivo con el mismo prefijo. Se usó el del periodo del mes (ej. ...052026062026 para junio); si ninguno lo trae, el primero."),
    "HOJA_NO_ENCONTRADA":     ("Pestaña faltante",               "El archivo existe pero no contiene la hoja especificada."),
    "ETIQUETA_NO_ENCONTRADA": ("Etiqueta no encontrada en Excel", "El texto que se buscaba como etiqueta de fila no existe en esa columna de la hoja indicada."),
    "SERVICIO_NO_APLICA":     ("No se encontró tal servicio",    "Esta unidad no ha registrado este servicio en los meses anteriores."),
    "ARCHIVO_VACIO":          ("Archivo sin datos numéricos",    "El archivo existe y la hoja fue leída, pero las celdas de datos están vacías o no son numéricas."),
    "VALOR_NULO":             ("Celda sin dato",                 "El archivo tiene datos pero alguna celda específica está vacía o no es numérica. Se usó 0 en su lugar."),
    "DESCARGA_FALLIDA":       ("Error al descargar archivo",     "El archivo existe en el FTP pero no pudo descargarse (error de red, permisos o archivo corrupto)."),
    "PB_JSON_ERROR":          ("Error en población JSON",        "La unidad o columna solicitada no existe en POBLACION.json."),
}


def registrar_error(log: LogErrores, id_error: str, unidad: str, reporte: str, ruta_afectada: str) -> None:
    rutas_de_la_unidad = log[id_error].unidades.setdefault(unidad, [])
    existente = next((r for r in rutas_de_la_unidad if r.ruta == ruta_afectada), None)

    if existente is None:
        rutas_de_la_unidad.append(RutaAfectada(reportes=[reporte], ruta=ruta_afectada))
    elif reporte not in existente.reportes:
        existente.reportes.append(reporte)
