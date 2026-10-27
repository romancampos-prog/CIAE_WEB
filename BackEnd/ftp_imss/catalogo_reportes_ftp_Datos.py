"""
Catalogo del FTP (ftp_imss/catalogo_ftp.json): las plantillas de ruta de cada tipo de carpeta, en
que carpeta de 1.SIAIS_Reportes vive cada reporte (con los nombres que esa carpeta tiene de
verdad en el FTP) y como viene el periodo del mes en el nombre del archivo. Se lee al arrancar:
tras editar el JSON hay que reiniciar el backend.
Usado en: ftp_imss/reportes_siais_ftp_Datos.py, indicadores/services/ftp/* (y epidemiologia)
"""
import json
from pathlib import Path

_RUTA_CATALOGO = Path(__file__).parent / "catalogo_ftp.json"
_CATALOGO = json.loads(_RUTA_CATALOGO.read_text(encoding="utf-8"))

RUTAS             = _CATALOGO["rutas"]
PERIODO_EN_NOMBRE = _CATALOGO["periodoEnNombre"]
CARPETAS          = _CATALOGO["carpetas"]

# {codigo: carpeta del catalogo}, ej. "CP03" -> "Salud Pública"
_CARPETA_POR_REPORTE: dict[str, str] = {
    codigo: carpeta
    for carpeta, datos in CARPETAS.items()
    for codigo in datos["archivos"]
}


def codigo_base(codigo_reporte: str) -> str:
    """El mapeo a veces trae sufijo ("CP03_algo"); el reporte es lo de antes del guion bajo."""
    return codigo_reporte.split("_")[0].strip().upper()


##--------------------------------------

def subcarpeta_de_reporte(codigo_reporte: str) -> str:
    """Carpeta del catalogo donde vive el reporte; ValueError si no esta en ftp_imss/catalogo_ftp.json."""
    carpeta = _CARPETA_POR_REPORTE.get(codigo_base(codigo_reporte))

    if carpeta is None:
        raise ValueError(f"El reporte '{codigo_reporte}' no esta en el catalogo del FTP (ftp_imss/catalogo_ftp.json).")

    return carpeta


##--------------------------------------

def es_de_piramides(codigo_reporte: str) -> bool:
    """True si el reporte vive en la carpeta de piramides del año (un archivo por unidad, ej. PB02)."""
    carpeta = _CARPETA_POR_REPORTE.get(codigo_base(codigo_reporte))
    return carpeta is not None and CARPETAS[carpeta].get("ruta") == "piramides"


##--------------------------------------

def periodo_en_nombre(ano: str, mes: str) -> str:
    """
    Lo que trae el nombre del archivo del mes: junio 2026 -> "052026062026" (el periodo SIMOC va
    del 26 de mayo al 25 de junio). Sirve para elegir el correcto cuando hay dos del mismo reporte.
    """
    mes_numero = int(mes)
    mes_anterior = 12 if mes_numero == 1 else mes_numero - 1
    anio_mes_anterior = int(ano) - 1 if mes_numero == 1 else int(ano)
    return PERIODO_EN_NOMBRE.format(
        mesAnterior=f"{mes_anterior:02d}", anioMesAnterior=anio_mes_anterior, mes=f"{mes_numero:02d}", anio=ano,
    )
