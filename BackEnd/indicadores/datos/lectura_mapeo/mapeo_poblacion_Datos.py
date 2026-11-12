"""
mapeo/POBLACION.json: en que hoja, filas y columnas viene la poblacion del Excel nacional de InfoSalud.
Usado en: datos/excel_subido/excel_poblacion_Datos.py
"""
import json
from pathlib import Path

RUTA_MAPEO_POBLACION = Path(__file__).parent.parent.parent / "mapeo" / "POBLACION.json"


def cargar_mapeo_poblacion() -> dict:
    with open(RUTA_MAPEO_POBLACION, "r", encoding="utf-8") as f:
        return json.load(f)
