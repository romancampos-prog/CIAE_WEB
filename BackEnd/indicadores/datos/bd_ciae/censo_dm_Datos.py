"""
BD_CIAE/CENSO_DM/CENSO_DM_{año}.json: el Censo de pacientes con DM de Guanajuato por unidad,
sexo y grupo de edad, ya leido del Excel nacional.
Usado en: services/censo_dm/*
"""
from pathlib import Path

from configs.settings import DATA_CENSO_DM
from datos.bd_ciae.archivos_bd_ciae_Datos import escribir_json, leer_json


def ruta_censo_dm(anio: str | int) -> Path:
    return DATA_CENSO_DM / f"CENSO_DM_{anio}.json"


##--------------------------------------

def leer_censo_dm(anio: str | int) -> dict:
    """El censo guardado de ese año; {} si no se ha subido."""
    return leer_json(ruta_censo_dm(anio))


##--------------------------------------

def guardar_censo_dm(anio: str | int, contenido: dict) -> None:
    escribir_json(ruta_censo_dm(anio), contenido)


##--------------------------------------

def anios_con_censo_dm() -> list[int]:
    """Los años que ya tienen su censo subido, del mas reciente al mas viejo."""
    if not DATA_CENSO_DM.exists():
        return []
    return sorted((int(ruta.stem.rsplit("_", 1)[1]) for ruta in DATA_CENSO_DM.glob("CENSO_DM_*.json")), reverse=True)
