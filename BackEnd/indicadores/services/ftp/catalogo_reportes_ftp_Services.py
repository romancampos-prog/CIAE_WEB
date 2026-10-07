"""
Catalogo de reportes de 1.SIAIS_Reportes (exclusivo de FTP): en que subcarpeta del
servidor vive cada reporte. Se usa para saber a que carpeta entrar cuando el mapeo
pide un reporte (ej. "CP03" -> "Salud Pública"). 110 reportes en 9 subcarpetas;
el detalle de columnas y renglones de cada uno esta en CATALOGO_REPORTES_SIAIS.md.
Usado en: services/ftp/navegacion_ftp_Services.py, services/ftp/extraccion_indicador_ftp_Services.py
"""

REPORTES_POR_SUBCARPETA: dict[str, tuple[str, ...]] = {
    "Estomatologia": (
        "EST01", "EST02", "EST03",
    ),
    "Indicadores": (
        "IN01", "IN02", "IN03", "IN04", "IN05", "IN06", "IN07", "IN08", "IN09", "IN10",
        "IN11", "IN12", "IN13", "IN14", "IN15", "IN16", "IN17", "IN18", "IN19", "IN20",
        "IN21", "IN22", "IN23", "IN24", "IN25", "IN26", "IN27", "IN28", "IN29", "IN30",
        "IN31", "IN32", "IN33",
    ),
    "Otros reportes": (
        "LAPI01", "OC05", "OC19", "OC27", "OC28", "OC33", "OC34", "OC36",
        "OC48", "OC49", "OC52", "OC56",
    ),
    "Planificación Familiar": (
        "PF01", "PF02", "PF03", "PF04", "PF05", "PF06", "PF07",
        "PF08", "PF09", "PF10", "PF11", "PF12", "PF13", "PF14",
    ),
    "Productividad": (
        "PM01", "PM02", "PM03", "PM04", "PM05", "PM06", "PM07", "PM08",
        "PU01", "PU02", "PU03", "PU04", "PU05", "PU06", "PU07", "PU08",
        "PU09", "PU10", "PU11", "PU12",
    ),
    "Salud en el Trabajo": (
        "ST01", "ST02", "ST03", "ST05", "ST06",
    ),
    "Salud Materna": (
        "MT01", "MT02", "MT03", "MT06",
    ),
    "Salud Pública": (
        "CHK01", "CHK02", "CHK03", "CHK04", "CHK05", "CHK06",
        "CIP01", "CP01", "CP02", "CP03", "CP04",
        "IAP01", "IAP02", "IAP03",
    ),
    "Validaciones": (
        "VA01", "VA02", "VA03", "VA04", "VA05",
    ),
}

# No viven en 1.SIAIS_Reportes de cada unidad sino en una carpeta del año con un
# archivo por unidad (la piramide de poblacion adscrita, ej. PB02 al 30 de junio).
REPORTES_DE_PIRAMIDES: tuple[str, ...] = ("PB02",)

_SUBCARPETA_POR_REPORTE: dict[str, str] = {
    reporte: subcarpeta
    for subcarpeta, reportes in REPORTES_POR_SUBCARPETA.items()
    for reporte in reportes
}


def _codigo_base(codigo_reporte: str) -> str:
    """El mapeo a veces trae sufijo ("CP03_algo"); el reporte es lo de antes del guion bajo."""
    return codigo_reporte.split("_")[0].strip().upper()


def existe_reporte(codigo_reporte: str) -> bool:
    return _codigo_base(codigo_reporte) in _SUBCARPETA_POR_REPORTE or es_reporte_de_piramides(codigo_reporte)


def es_reporte_de_piramides(codigo_reporte: str) -> bool:
    return _codigo_base(codigo_reporte) in REPORTES_DE_PIRAMIDES


def subcarpeta_de_reporte(codigo_reporte: str) -> str:
    """Subcarpeta de 1.SIAIS_Reportes donde vive el reporte; ValueError si no esta en el catalogo."""
    subcarpeta = _SUBCARPETA_POR_REPORTE.get(_codigo_base(codigo_reporte))
    if subcarpeta is None:
        raise ValueError(f"El reporte '{codigo_reporte}' no esta en el catalogo de 1.SIAIS_Reportes.")
    return subcarpeta


def reportes_de_subcarpeta(subcarpeta: str) -> tuple[str, ...]:
    return REPORTES_POR_SUBCARPETA.get(subcarpeta, ())
