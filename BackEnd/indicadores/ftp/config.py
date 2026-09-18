import json
import datetime
from pathlib import Path
from configs.settings import DATA_INDICADORES, DATA_POBLACION_INFOSALUD

_MAPEO_UNIFICADO = Path(__file__).parent.parent / "mapeo"

_u = json.loads((_MAPEO_UNIFICADO / "unidades" / "ftp.json").read_text(encoding="utf-8"))
UNIDADES_PREVIOS      = _u["UNIDADES_PREVIOS"]
UNIDADES_FINALES      = _u["UNIDADES_FINALES"]
NOMBREUNIDADESARCHIVO = _u["NOMBREUNIDADESARCHIVO"]
CLAVE_UNIDADES        = _u["CLAVE_UNIDADES"]
CLAVE_UNIDADES_F      = _u["CLAVE_UNIDADES_F"]

RUTA_DATA_FTP        = DATA_INDICADORES          # {año}/{familia}/... y {año}/SEMANAL/... -- misma ruta que usa bd_Ciae_Indicadores_Services.py
RUTA_POBLACION_DIR   = DATA_POBLACION_INFOSALUD


def ruta_poblacion(anio: str | int | None = None) -> Path:
    """POBLACION_{anio}.json -- si no se especifica año, usa el año en curso."""
    anio = anio or datetime.date.today().year
    return RUTA_POBLACION_DIR / f"POBLACION_{anio}.json"

RUTA_MAPEO_UNIFICADO  = _MAPEO_UNIFICADO  # indicadores/mapeo/{familia}.json -- indicadores nuevos (ej. modulo "Extractor")
RUTA_MAPEO_POBLACION  = _MAPEO_UNIFICADO / "POBLACION.json"  # movido a indicadores/mapeo -- ya no vive dentro de ftp/
