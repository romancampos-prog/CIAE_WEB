import json
from pathlib import Path
from configs.settings import DATA_DIR

_MAPEO = Path(__file__).parent / "mapeo"

_u = json.loads((_MAPEO / "unidades.json").read_text(encoding="utf-8"))
MESES               = _u["MESES"]
ORDEN_IAAS01        = _u["ORDEN_IAAS01"]
UNIDADES_HGS_IAAS01 = _u["UNIDADES_HGS_IAAS01"]
UNIDADES_HGZ_IAAS01 = _u["UNIDADES_HGZ_IAAS01"]
UNIDADES_HGR_IAAS01 = _u["UNIDADES_HGR_IAAS01"]
UNIDADES_HGO_IAAS01 = _u.get("UNIDADES_HGO_IAAS01", [])
UNIDADES_HGP_IAAS01 = _u.get("UNIDADES_HGP_IAAS01", [])
ORDEN_DEMAS_IAAS    = _u["ORDEN_DEMAS_IAAS"]

# Mapa unidad → tipo de semáforo para IAAS 01
_IAAS01_TIPO: dict[str, str] = {}
for _u_name in UNIDADES_HGS_IAAS01: _IAAS01_TIPO[_u_name] = "HGS"
for _u_name in UNIDADES_HGZ_IAAS01: _IAAS01_TIPO[_u_name] = "HGZ"
for _u_name in UNIDADES_HGR_IAAS01: _IAAS01_TIPO[_u_name] = "HGR"
for _u_name in UNIDADES_HGO_IAAS01: _IAAS01_TIPO[_u_name] = "HGO"
for _u_name in UNIDADES_HGP_IAAS01: _IAAS01_TIPO[_u_name] = "HGP"
UNIDAD_TIPO_IAAS01 = _IAAS01_TIPO

RUTA_IAAS      = DATA_DIR / "INDICADORES" / "IAAS"
RUTA_IAAS_JSON = _MAPEO / "IAAS.json"
RUTA_DATA_IAAS = DATA_DIR / "INDICADORES" / "IAAS"
