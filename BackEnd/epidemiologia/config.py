from pathlib import Path
from configs.settings import DATA_DIR

_MAPEO = Path(__file__).parent / "mapeo" / "dengue"
_MAPEO_FTP = Path(__file__).parent / "mapeo" / "ftp"

RUTA_OPERATIVA       = DATA_DIR / "EPIDEMIOLOGIA" / "Dengue" / "bases"             / "base_operativa.xlsx"
RUTA_SISCEP          = DATA_DIR / "EPIDEMIOLOGIA" / "Dengue" / "bases"             / "base_siscep.xlsx"
RUTA_PIPELINE_ESTADO = DATA_DIR / "EPIDEMIOLOGIA" / "Dengue" / "fecha_ultimo_repo" / "utimoReporte.json"
RUTA_HISTORICO_EPI   = DATA_DIR / "EPIDEMIOLOGIA" / "Dengue" / "historico"
RUTA_RESULTADOS_EPI  = DATA_DIR / "EPIDEMIOLOGIA" / "Dengue" / "resultados"
RUTA_EXTRACCIONES_FTP = DATA_DIR / "EPIDEMIOLOGIA" / "FTP"

RUTA_GTO_JSON     = _MAPEO / "gto_normalizado.json"
RUTA_CATALOGO_EPI = _MAPEO / "cp_coordenadas.csv"

RUTA_FTP_ACCIONES = _MAPEO_FTP
