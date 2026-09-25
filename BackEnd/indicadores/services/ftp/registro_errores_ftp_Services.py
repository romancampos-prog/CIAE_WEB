"""
Registro de errores de la extraccion de FTP: catalogo de tipos y como se anota
cada uno por unidad y ruta. El front los muestra como "restricciones".
Usado en: services/ftp/*, ftp/services/recalcular_poblacion_service.py
"""
from schemas.model.generacion_ftp_Model import ErrorExtraccion, LogErrores, RutaAfectada

_CATALOGO_ERRORES: dict[str, tuple[str, str]] = {
    "RUTA_INVALIDA":          ("Ruta de acceso incorrecta",      "La carpeta en el FTP no existe o está mal nombrada."),
    "ARCHIVO_NO_ENCONTRADO":  ("Archivo no encontrado",          "El archivo no se encontró en la ubicación esperada."),
    "ARCHIVO_DUPLICADO":      ("Archivo duplicado",              "Se encontró más de un archivo con el mismo prefijo. Se usó el primero encontrado."),
    "HOJA_NO_ENCONTRADA":     ("Pestaña faltante",               "El archivo existe pero no contiene la hoja especificada."),
    "ETIQUETA_NO_ENCONTRADA": ("Etiqueta no encontrada en Excel", "El texto que se buscaba como etiqueta de fila no existe en esa columna de la hoja indicada."),
    "SERVICIO_NO_APLICA":     ("No se encontró tal servicio",    "Esta unidad no ha registrado este servicio en los meses anteriores."),
    "ARCHIVO_VACIO":          ("Archivo sin datos numéricos",    "El archivo existe y la hoja fue leída, pero las celdas de datos están vacías o no son numéricas."),
    "VALOR_NULO":             ("Celda sin dato",                 "El archivo tiene datos pero alguna celda específica está vacía o no es numérica. Se usó 0 en su lugar."),
    "DESCARGA_FALLIDA":       ("Error al descargar archivo",     "El archivo existe en el FTP pero no pudo descargarse (error de red, permisos o archivo corrupto)."),
    "PB_JSON_ERROR":          ("Error en población JSON",        "La unidad o columna solicitada no existe en POBLACION.json."),
}


def crear_log_errores() -> LogErrores:
    return {
        id_error: ErrorExtraccion(nombreError=nombre, descripcionError=descripcion)
        for id_error, (nombre, descripcion) in _CATALOGO_ERRORES.items()
    }


def registrar_error(log: LogErrores, id_error: str, unidad: str, reporte: str, ruta_afectada: str) -> None:
    rutas_de_la_unidad = log[id_error].unidades.setdefault(unidad, [])
    existente = next((r for r in rutas_de_la_unidad if r.ruta == ruta_afectada), None)
    if existente is None:
        rutas_de_la_unidad.append(RutaAfectada(reportes=[reporte], ruta=ruta_afectada))
    elif reporte not in existente.reportes:
        existente.reportes.append(reporte)


def solo_con_errores(log: LogErrores) -> LogErrores:
    """Quita los tipos de error que no tuvieron ninguna unidad afectada."""
    return {id_error: error for id_error, error in log.items() if error.unidades}


def error_de_conexion() -> LogErrores:
    return {"CONEXION": ErrorExtraccion(nombreError="Error FTP", descripcionError="Fallo de conexión")}


def error_de_calculo(errores_por_unidad: dict[str, str]) -> ErrorExtraccion:
    return ErrorExtraccion(
        nombreError="Error de cálculo",
        descripcionError="Falló la evaluación de la fórmula del indicador para estas unidades.",
        unidades={
            unidad: [RutaAfectada(reportes=["cálculo"], ruta=mensaje)]
            for unidad, mensaje in errores_por_unidad.items()
        },
    )
