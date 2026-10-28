"""
Rutas y lectura/escritura de los JSON de indicadores en BD_CIAE (el unico lugar que arma sus rutas):
  Definitivo: {DATA_INDICADORES}/{año}/{familia}/{familia}_{n}.json            -> "MESES"
  Semanal:    {DATA_INDICADORES}/{año}/SEMANAL/{familia}_{n}_{año}_semana.json -> "MES"
  Extractor:  el mismo definitivo (numerador crudo en "MESES" y el corte en "CORTES"),
              mas {año}/EXTRACTOR_CRUCE y {año}/EXTRACTOR_PARTES.
Usado en: datos/bd_ciae/*, services/reporte_guardado/reporte_guardado_Services.py
"""
import json
import re
from pathlib import Path

from configs.settings import DATA_INDICADORES


def validar_ano(ano: str | int) -> str:
    """El año llega del usuario y arma rutas de archivo: solo se aceptan 4 digitos."""
    if not re.fullmatch(r"\d{4}", str(ano)):
        raise ValueError(f"Año inválido: {ano!r}")
    return str(ano)


##--------------------------------------

def ruta_definitivo(indicador: str, ano: str | int) -> Path:
    familia = indicador.split()[0] if indicador.split() else indicador
    return DATA_INDICADORES / validar_ano(ano) / familia / (indicador.replace(" ", "_") + ".json")


##--------------------------------------

def ruta_semanal(indicador: str, ano: str | int) -> Path:
    ano = validar_ano(ano)
    return DATA_INDICADORES / ano / "SEMANAL" / (indicador.replace(" ", "_") + f"_{ano}_semana.json")


##--------------------------------------

def ruta_extractor(carpeta: str, indicador: str, anio: int) -> Path:
    """EXTRACTOR_CRUCE (afiliaciones cifradas, aparte del reporte) o EXTRACTOR_PARTES (conteo de cada archivo)."""
    return DATA_INDICADORES / validar_ano(anio) / carpeta / (indicador.replace(" ", "_") + ".json")


##--------------------------------------

def leer_json(ruta: Path) -> dict:
    if not ruta.exists():
        return {}

    try:
        with open(ruta, encoding="utf-8") as archivo:
            return json.load(archivo)
    except Exception:
        return {}


##--------------------------------------

def leer_json_para_actualizar(ruta: Path, vacio: dict) -> dict:
    """Al guardar NO se tolera un JSON corrupto: falla en vez de sobrescribir el historico."""
    if not ruta.exists():
        return vacio
    with open(ruta, encoding="utf-8") as archivo:
        return json.load(archivo)


##--------------------------------------

def escribir_json(ruta: Path, contenido: dict) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    with open(ruta, "w", encoding="utf-8") as archivo:
        json.dump(contenido, archivo, ensure_ascii=False, indent=2)
