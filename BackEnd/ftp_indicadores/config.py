import json
from pathlib import Path
from configs.settings import DATA_DIR

_MAPEO = Path(__file__).parent / "mapeo"

_u = json.loads((_MAPEO / "unidades.json").read_text(encoding="utf-8"))
UNIDADES_PREVIOS      = _u["UNIDADES_PREVIOS"]
UNIDADES_FINALES      = _u["UNIDADES_FINALES"]
NOMBREUNIDADESARCHIVO = _u["NOMBREUNIDADESARCHIVO"]
CLAVE_UNIDADES        = _u["CLAVE_UNIDADES"]
CLAVE_UNIDADES_F      = _u["CLAVE_UNIDADES_F"]

RUTA_FTP             = DATA_DIR / "FTP"
RUTA_HISTORIAL_FTP   = DATA_DIR / "FTP" / "Historial_xlsx"
RUTA_DATA_FTP        = DATA_DIR / "FTP" / "Data_FTP"
RUTA_POBLACION       = DATA_DIR / "FTP" / "poblacion" / "POBLACION.json"

RUTA_INDICADORES_JSON = _MAPEO
RUTA_MAPEO_POBLACION  = _MAPEO / "POBLACION.json"

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
