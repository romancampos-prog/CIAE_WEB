"""
Lo extraido del FTP en BD_CIAE/EPIDEMIOLOGIA/FTP/{extraccion}/{año}/{extraccion}_{año}{mes}.json:
un solo archivo por mes. Adentro, "semana" dice que es (null = definitivo, n = previo de la semana n);
cada extraccion del mes sobrescribe ese mismo archivo (el previo es acumulado, no se pierde nada).
Usado en: services/ftp/ftpExtraer.py (guardar), services/ftp/consulta_extraccion_Services.py (leer),
          services/ftp/periodos_extraccion_Services.py (listar)
"""
import json
from pathlib import Path

from epidemiologia.config import RUTA_EXTRACCIONES_FTP


def guardar_extraccion(extraccion: str, ano: int, mes: str, contenido: dict) -> Path:
    """Escribe el JSON del mes (reemplaza al que hubiera) y regresa su ruta."""

    ruta = _ruta_extraccion(extraccion, ano, mes)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(json.dumps(contenido, ensure_ascii=False, indent=2), encoding="utf-8")

    return ruta


##--------------------------------------

def leer_extraccion(extraccion: str, ano: int, mes: str) -> dict | None:
    """El JSON guardado del mes, o None si ese mes no se ha extraido."""

    ruta = _ruta_extraccion(extraccion, ano, mes)

    if not ruta.exists():
        return None

    return json.loads(ruta.read_text(encoding="utf-8"))


##--------------------------------------

def periodos_guardados(extraccion: str, ano: int) -> list[tuple[str, int | None]]:
    """(mes "09", semana del JSON o None si es definitivo) de cada mes guardado del año."""

    carpeta = RUTA_EXTRACCIONES_FTP / extraccion / str(ano)

    if not carpeta.exists():
        return []

    periodos = []

    for ruta in carpeta.glob(f"{extraccion}_{ano}??.json"):
        mes = ruta.stem[len(f"{extraccion}_{ano}"):]
        periodos.append((mes, json.loads(ruta.read_text(encoding="utf-8")).get("semana")))

    return periodos


##--------------------------------------

def _ruta_extraccion(extraccion: str, ano: int, mes: str) -> Path:
    return RUTA_EXTRACCIONES_FTP / extraccion / str(ano) / f"{extraccion}_{ano}{mes}.json"
