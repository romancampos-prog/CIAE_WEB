"""
Unidades medicas de FTP (carpetas del servidor, nombres para archivos y claves) y ruta
de la poblacion. Se leen de mapeo/unidades/ftp.json. Las usan FTP, Extractor y el Excel.
Usado en: services/ftp/*, services/excel_dibujante_Services.py, extractor/services/extractor_service.py,
          ftp/services/poblacion_service.py, ftp/services/recalcular_poblacion_service.py
"""
import datetime
import json
from pathlib import Path

from configs.settings import DATA_POBLACION_INFOSALUD

_MAPEO_UNIFICADO = Path(__file__).parent.parent / "mapeo"

_unidades = json.loads((_MAPEO_UNIFICADO / "unidades" / "ftp.json").read_text(encoding="utf-8"))
UNIDADES_PREVIOS      = _unidades["UNIDADES_PREVIOS"]
UNIDADES_FINALES      = _unidades["UNIDADES_FINALES"]
NOMBREUNIDADESARCHIVO = _unidades["NOMBREUNIDADESARCHIVO"]
CLAVE_UNIDADES        = _unidades["CLAVE_UNIDADES"]
CLAVE_UNIDADES_F      = _unidades["CLAVE_UNIDADES_F"]

RUTA_POBLACION_DIR   = DATA_POBLACION_INFOSALUD
RUTA_MAPEO_POBLACION = _MAPEO_UNIFICADO / "POBLACION.json"


def ruta_poblacion(anio: str | int | None = None) -> Path:
    """POBLACION_{anio}.json -- si no se especifica año, usa el año en curso."""
    anio = anio or datetime.date.today().year
    return RUTA_POBLACION_DIR / f"POBLACION_{anio}.json"
