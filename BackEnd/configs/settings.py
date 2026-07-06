#----------------- SETTINGS.PY -----------------#
"""
Módulo  : settings.py
Carpeta : configs/
Qué hace: Configuración global — rutas, variables de entorno y constantes del proyecto.
Usado en: todos los módulos
"""

from pathlib import Path 
from dotenv import load_dotenv
import os

load_dotenv()

# ─── Rutas base ───────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR  = BASE_DIR.parent / "Data"


# ─── Auth ─────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY")


# ─── FTP ──────────────────────────────────────────────────
FTP_SERVER = os.getenv("FTP_SERVER")
FTP_USER   = os.getenv("FTP_USER")
FTP_PASS   = os.getenv("FTP_PASS")


# ─── Rutas FTP ────────────────────────────────────────────
RUTA_FTP              = DATA_DIR / "FTP"
RUTA_INDICADORES_JSON = DATA_DIR / "FTP" / "Mapeo_json"
RUTA_HISTORIAL_FTP    = DATA_DIR / "FTP" / "Historial_xlsx"
RUTA_DATA_FTP         = DATA_DIR / "FTP" / "Data_FTP"
RUTA_POBLACION        = DATA_DIR / "FTP" / "poblacion" / "POBLACION.json"
RUTA_MAPEO_POBLACION  = DATA_DIR / "FTP" / "Mapeo_json" / "POBLACION.json"


# ─── Rutas IN_ASS ─────────────────────────────────────────
RUTA_IASS        = DATA_DIR / "IASS"
RUTA_IN_ASS_JSON = DATA_DIR / "IASS" / "Mapeo_json" / "IN_ASS.json"
RUTA_DATA_IN_ASS = DATA_DIR / "IASS" / "Data_IN_ASS"


# ─── Rutas Epidemiología ──────────────────────────────────
RUTA_EPIDEMEOLOGIA   = DATA_DIR / "EPIDEMEOLOGIA"
RUTA_OPERATIVA       = DATA_DIR / "EPIDEMEOLOGIA" / "bases"             / "base_operativa.xlsx"
RUTA_SISCEP          = DATA_DIR / "EPIDEMEOLOGIA" / "bases"             / "base_siscep.xlsx"
RUTA_GTO_JSON        = DATA_DIR / "EPIDEMEOLOGIA" / "gto_normalizado.json"
RUTA_CATALOGO_EPI    = DATA_DIR / "EPIDEMEOLOGIA" / "municipios_cord"   / "cp_coordenadas.csv"
RUTA_PIPELINE_ESTADO  = DATA_DIR / "EPIDEMEOLOGIA" / "fecha_ultimo_repo" / "utimoReporte.json"
RUTA_HISTORICO_EPI    = DATA_DIR / "EPIDEMEOLOGIA" / "historico"
RUTA_RESULTADOS_EPI   = DATA_DIR / "EPIDEMEOLOGIA" / "resultados"


# ─── Mapa de indicadores ──────────────────────────────────
ICONOS_INDICADORES = {
    "CAMA": {"json": RUTA_INDICADORES_JSON / "CAMA.json", "icono": "icono_cama.png"},
    "CACU": {"json": RUTA_INDICADORES_JSON / "CACU.json", "icono": "icono_cacu.png"},
    "EH":   {"json": RUTA_INDICADORES_JSON / "EH.json",   "icono": "icono_eh.png"},
    "DM":   {"json": RUTA_INDICADORES_JSON / "DM.json",   "icono": "icono_dm.png"},
    "MT":   {"json": RUTA_INDICADORES_JSON / "MT.json",   "icono": "icono_mt.png"},
    "CUPN": {"json": RUTA_INDICADORES_JSON / "CUPN.json", "icono": "icono_cupn.png"},
    "S_Ob": {"json": RUTA_INDICADORES_JSON / "S_Ob.json", "icono": "icono_S_Ob.png"},
    "CE":   {"json": RUTA_INDICADORES_JSON / "CE.json",   "icono": "icono_ce.png"},
}

# ─── General ──────────────────────────────────────────────
AÑO_ACTUAL = 2026
