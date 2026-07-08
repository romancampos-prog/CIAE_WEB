import json
from pathlib import Path
from configs.settings import DATA_DIR

_MAPEO = Path(__file__).parent / "mapeo"

_u = json.loads((_MAPEO / "unidades.json").read_text(encoding="utf-8"))
MESES               = _u["MESES"]
ORDEN_IASS01        = _u["ORDEN_IASS01"]
UNIDADES_HGS_IASS01 = _u["UNIDADES_HGS_IASS01"]
ORDEN_DEMAS_IASS    = _u["ORDEN_DEMAS_IASS"]

RUTA_IASS      = DATA_DIR / "IASS"
RUTA_IASS_JSON = _MAPEO / "IASS.json"
RUTA_DATA_IASS = DATA_DIR / "IASS" / "Data_IASS"
