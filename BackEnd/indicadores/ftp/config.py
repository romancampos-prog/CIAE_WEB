import json
import datetime
from pathlib import Path
from configs.settings import DATA_INDICADORES, DATA_POBLACION_INFOSALUD

_MAPEO           = Path(__file__).parent / "mapeo"
_MAPEO_UNIFICADO = Path(__file__).parent.parent / "mapeo"

_u = json.loads((_MAPEO / "unidades.json").read_text(encoding="utf-8"))
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

RUTA_INDICADORES_JSON = _MAPEO
RUTA_MAPEO_UNIFICADO  = _MAPEO_UNIFICADO  # indicadores/mapeo/{familia}.json -- indicadores nuevos (ej. modulo "Extractor")
RUTA_MAPEO_POBLACION  = _MAPEO_UNIFICADO / "POBLACION.json"  # movido a indicadores/mapeo -- ya no vive dentro de ftp/

ICONOS_INDICADORES = {
    "CAMA": {"json": _MAPEO / "CAMA.json", "icono": "icono_cama.png"},
    "CACU": {"json": _MAPEO / "CACU.json", "icono": "icono_cacu.png"},
    "EH":   {"json": _MAPEO / "EH.json",   "icono": "icono_eh.png"},
    "DM":   {"json": _MAPEO / "DM.json",   "icono": "icono_dm.png"},
    "MT":   {"json": _MAPEO / "MT.json",   "icono": "icono_mt.png"},
    "CUPN": {"json": _MAPEO / "CUPN.json", "icono": "icono_cupn.png"},
    "S_Ob": {"json": _MAPEO / "S_Ob.json", "icono": "icono_S_Ob.png"},
    "CE":   {"json": _MAPEO / "CE.json",   "icono": "icono_ce.png"},
}
