"""
Módulo  : auditoria_service.py
Carpeta : shared/
Qué hace: Registra eventos importantes (login, subida de archivos, etc.) en un
          archivo de log, para poder investigar después quién hizo qué y cuándo.
Usado en: cualquier controller que quiera dejar constancia de una acción
"""
import logging
from configs.settings import DATA_DIR

_RUTA_LOG = DATA_DIR / "auditoria.log"
_RUTA_LOG.parent.mkdir(parents=True, exist_ok=True)

_logger = logging.getLogger("auditoria")
_logger.setLevel(logging.INFO)

if not _logger.handlers:
    _handler = logging.FileHandler(_RUTA_LOG, encoding="utf-8")
    _handler.setFormatter(logging.Formatter("%(asctime)s | %(message)s"))
    _logger.addHandler(_handler)


def registrar(evento: str, usuario: str = "-", ip: str = "-", detalle: str = ""):
    """
    evento:  tipo de acción, ej. "LOGIN_EXITOSO", "LOGIN_FALLIDO", "SUBIDA_ARCHIVO"
    usuario: quién hizo la acción
    ip:      desde dónde
    detalle: información extra (nombre de archivo, bytes, etc.)
    """
    _logger.info(f"{evento} | usuario={usuario} | ip={ip} | {detalle}")
