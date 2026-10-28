"""
Lo extraido del FTP en BD_CIAE/EPIDEMIOLOGIA/FTP/{extraccion}/{año}/{extraccion}_{año}{mes}[_S{semana}].json
(una corrida del mismo periodo reemplaza a la anterior).
Usado en: services/ftp/ftpExtraer.py (guardar), services/ftp/consulta_extraccion_Services.py (leer),
          services/ftp/periodos_extraccion_Services.py (listar)
"""
import json
from pathlib import Path

from epidemiologia.config import RUTA_EXTRACCIONES_FTP


def guardar_extraccion(extraccion: str, ano: int, mes: str, semana: int | None, contenido: dict) -> Path:
    """Escribe el JSON del periodo y regresa su ruta."""

    ruta = _ruta_extraccion(extraccion, ano, mes, semana)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(json.dumps(contenido, ensure_ascii=False, indent=2), encoding="utf-8")

    return ruta


##--------------------------------------

def leer_extraccion(extraccion: str, ano: int, mes: str, semana: int | None) -> dict | None:
    """El JSON guardado del periodo, o None si ese periodo no se ha extraido."""

    ruta = _ruta_extraccion(extraccion, ano, mes, semana)

    if not ruta.exists():
        return None

    return json.loads(ruta.read_text(encoding="utf-8"))


##--------------------------------------

def periodos_guardados(extraccion: str, ano: int) -> list[tuple[str, int | None]]:
    """(mes "09", semana o None si es definitivo) de cada archivo guardado del año."""

    carpeta = RUTA_EXTRACCIONES_FTP / extraccion / str(ano)

    if not carpeta.exists():
        return []

    periodos = []

    for ruta in carpeta.glob(f"{extraccion}_{ano}*.json"):
        mes, _, semana = ruta.stem[len(f"{extraccion}_{ano}"):].partition("_S")
        periodos.append((mes, int(semana) if semana else None))

    return periodos


##--------------------------------------

def _ruta_extraccion(extraccion: str, ano: int, mes: str, semana: int | None) -> Path:
    sufijo = f"_S{semana}" if semana is not None else ""
    return RUTA_EXTRACCIONES_FTP / extraccion / str(ano) / f"{extraccion}_{ano}{mes}{sufijo}.json"
