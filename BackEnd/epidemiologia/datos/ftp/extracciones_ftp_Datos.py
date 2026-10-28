"""
Lo extraido del FTP en BD_CIAE/EPIDEMIOLOGIA/FTP/{extraccion}/{año}/{extraccion}_{año}{mes}[_S{semana}].json
(una corrida del mismo periodo reemplaza a la anterior).
Usado en: services/ftp/ftpExtraer.py
"""
import json
from pathlib import Path

from epidemiologia.config import RUTA_EXTRACCIONES_FTP


def guardar_extraccion(extraccion: str, ano: int, mes: str, semana: int | None, contenido: dict) -> Path:
    """Escribe el JSON del periodo y regresa su ruta."""

    sufijo = f"_S{semana}" if semana is not None else ""
    carpeta = RUTA_EXTRACCIONES_FTP / extraccion / str(ano)
    carpeta.mkdir(parents=True, exist_ok=True)

    ruta = carpeta / f"{extraccion}_{ano}{mes}{sufijo}.json"
    ruta.write_text(json.dumps(contenido, ensure_ascii=False, indent=2), encoding="utf-8")

    return ruta
