"""
Catalogo de claves UP (mapeo/ftp/catalogos/claves_up.json, sacado de "CLAVES UP PARA REGISTRO EN
SIMF Y RAIS OF 015.xlsx"): que significa cada clave, su grupo y si se registra en RAIS o en SIMF.
Tambien el color de cada clave en pantalla (mapeo/ftp/catalogos/colores_claves.json).
Usado en: services/ftp/consulta_extraccion_Services.py, services/ftp/excel_extraccion_Services.py
"""
import json
from functools import lru_cache

from epidemiologia.config import RUTA_CLAVES_UP, RUTA_COLORES_CLAVES


@lru_cache(maxsize=1)
def claves_up() -> dict[str, dict]:
    """{"UP87": {descripcion, grupo, subgrupo, claveAnterior, registroRAIS, registroSIMF}}. Se lee una vez: tras editarlo, reiniciar el backend."""

    return json.loads(RUTA_CLAVES_UP.read_text(encoding="utf-8"))["claves"]


##--------------------------------------

@lru_cache(maxsize=1)
def colores_claves() -> dict[str, str]:
    """{"UP407": "#0e7490", ...}. Se lee una vez: tras editarlo, reiniciar el backend."""

    return json.loads(RUTA_COLORES_CLAVES.read_text(encoding="utf-8"))["colores"]
