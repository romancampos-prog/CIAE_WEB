"""
mapeo/CENSO_DM.json: en que hoja y columnas viene el Censo de pacientes con DM por unidad de adscripcion.
Usado en: datos/excel_subido/excel_censo_dm_Datos.py
"""
import json
from pathlib import Path

RUTA_MAPEO_CENSO_DM = Path(__file__).parent.parent.parent / "mapeo" / "CENSO_DM.json"


def cargar_mapeo_censo_dm() -> dict:
    with open(RUTA_MAPEO_CENSO_DM, "r", encoding="utf-8") as f:
        return json.load(f)
