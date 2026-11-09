"""
El estatus de seguimiento de cada registro de una extraccion (No revisado / En proceso / Con
estudio): el catalogo sale del mapeo (mapeo/ftp/catalogos/estatus_acciones.json) y lo que el admin
elige se guarda en BD_CIAE/EPIDEMIOLOGIA/ACCIONES/{extraccion}/estatus.json ({id del registro: clave del
estatus}): fuera de FTP/ porque es captura (no se regenera) y asi no se pierde al re-extraer el mes.
Usado en: services/ftp/consulta_extraccion_Services.py, services/ftp/estatus_acciones_Services.py
"""
import json
from functools import lru_cache

from epidemiologia.config import RUTA_CAPTURA_ACCIONES, RUTA_ESTATUS_ACCIONES


@lru_cache(maxsize=1)
def catalogo_estatus() -> dict:
    """{"inicial": "NO_REVISADO", "estatus": [{clave, nombre, nivel}]}. Se lee una vez: tras editarlo, reiniciar el backend."""

    return json.loads(RUTA_ESTATUS_ACCIONES.read_text(encoding="utf-8"))


##--------------------------------------

def leer_estatus(extraccion: str) -> dict[str, str]:
    """{id del registro: clave del estatus} de lo que ya se marco; {} si nada."""

    ruta = RUTA_CAPTURA_ACCIONES / extraccion / "estatus.json"

    if not ruta.exists():
        return {}

    return json.loads(ruta.read_text(encoding="utf-8"))


##--------------------------------------

def guardar_estatus(extraccion: str, estatus: dict[str, str]) -> None:
    """Reescribe el archivo de estatus de la extraccion completo."""

    ruta = RUTA_CAPTURA_ACCIONES / extraccion / "estatus.json"
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(json.dumps(estatus, ensure_ascii=False, indent=2), encoding="utf-8")
