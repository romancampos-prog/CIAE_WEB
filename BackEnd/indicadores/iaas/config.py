import json
from pathlib import Path
from configs.settings import DATA_DIR

_MAPEO = Path(__file__).parent / "mapeo"

_u = json.loads((_MAPEO / "unidades.json").read_text(encoding="utf-8"))
MESES               = _u["MESES"]
ORDEN_IASS01        = _u["ORDEN_IASS01"]
UNIDADES_HGS_IASS01 = _u["UNIDADES_HGS_IASS01"]
UNIDADES_HGZ_IASS01 = _u["UNIDADES_HGZ_IASS01"]
UNIDADES_HGR_IASS01 = _u["UNIDADES_HGR_IASS01"]
UNIDADES_HGO_IASS01 = _u.get("UNIDADES_HGO_IASS01", [])
UNIDADES_HGP_IASS01 = _u.get("UNIDAES_HGP_IASS01", [])
ORDEN_DEMAS_IASS    = _u["ORDEN_DEMAS_IASS"]

# Mapa unidad → tipo de semáforo para IAAS 01
_IASS01_TIPO: dict[str, str] = {}
for _u_name in UNIDADES_HGS_IASS01: _IASS01_TIPO[_u_name] = "HGS"
for _u_name in UNIDADES_HGZ_IASS01: _IASS01_TIPO[_u_name] = "HGZ"
for _u_name in UNIDADES_HGR_IASS01: _IASS01_TIPO[_u_name] = "HGR"
for _u_name in UNIDADES_HGO_IASS01: _IASS01_TIPO[_u_name] = "HGO"
for _u_name in UNIDADES_HGP_IASS01: _IASS01_TIPO[_u_name] = "HGP"
UNIDAD_TIPO_IASS01 = _IASS01_TIPO

RUTA_IASS      = DATA_DIR / "INDICADORES" / "IAAS"
RUTA_IASS_JSON = _MAPEO / "IAAS.json"
RUTA_DATA_IASS = DATA_DIR / "INDICADORES" / "IAAS"
