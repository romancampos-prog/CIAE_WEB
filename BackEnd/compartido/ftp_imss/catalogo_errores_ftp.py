"""
Catalogo de errores al leer reportes del FTP: id -> (nombre, descripcion). Lo comparten la
extraccion de indicadores (las "restricciones" del front) y la de epidemiologia (Acciones).
Usado en: indicadores/services/ftp/extraer_indicador_ftp_Services.py, epidemiologia/services/ftp/
"""

CATALOGO_ERRORES_FTP: dict[str, tuple[str, str]] = {
    "RUTA_INVALIDA":          ("Ruta de acceso incorrecta",      "La carpeta en el FTP no existe o está mal nombrada."),
    "ARCHIVO_NO_ENCONTRADO":  ("Archivo no encontrado",          "El archivo no se encontró en la ubicación esperada."),
    "ARCHIVO_DUPLICADO":      ("Archivo duplicado",              "Se encontró más de un archivo con el mismo prefijo. Se usó el del periodo del mes (ej. ...052026062026 para junio); si ninguno lo trae, el primero."),
    "ARCHIVO_DUPLICADO_OMITIDO": ("Archivo duplicado",          "Hay más de un archivo con el mismo prefijo en la carpeta de la unidad. No se extrajo: hay que dejar uno solo en el FTP y volver a extraer."),
    "HOJA_NO_ENCONTRADA":    ("Pestaña faltante",               "El archivo existe pero no contiene la hoja especificada."),
    "ETIQUETA_NO_ENCONTRADA": ("Etiqueta no encontrada en Excel", "El texto que se buscaba como etiqueta de fila no existe en esa columna de la hoja indicada."),
    "ENCABEZADO_DISTINTO":    ("Encabezado distinto",            "El reporte no trae en esa columna el encabezado que espera el mapeo (el formato del reporte cambió)."),
    "SERVICIO_NO_APLICA":     ("No se encontró tal servicio",    "Esta unidad no ha registrado este servicio en los meses anteriores."),
    "ARCHIVO_VACIO":          ("Archivo sin datos numéricos",    "El archivo existe y la hoja fue leída, pero las celdas de datos están vacías o no son numéricas."),
    "VALOR_NULO":             ("Celda sin dato",                 "El archivo tiene datos pero alguna celda específica está vacía o no es numérica. Se usó 0 en su lugar."),
    "DESCARGA_FALLIDA":       ("Error al descargar archivo",     "El archivo existe en el FTP pero no pudo descargarse (error de red, permisos o archivo corrupto)."),
    "PB_JSON_ERROR":          ("Error en población JSON",        "La unidad o columna solicitada no existe en POBLACION.json."),
}
