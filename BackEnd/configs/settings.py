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
# Por seguridad, los datos viven fuera del repo (sibling de WEB_CIAE_SERVER), en BD_CIAE.
DATA_DIR  = BASE_DIR.parent.parent / "BD_CIAE"


# ─── Auth ─────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY")


# ─── FTP ──────────────────────────────────────────────────
FTP_SERVER = os.getenv("FTP_SERVER")
FTP_USER   = os.getenv("FTP_USER")
FTP_PASS   = os.getenv("FTP_PASS")