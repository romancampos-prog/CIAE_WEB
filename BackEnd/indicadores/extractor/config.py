"""
Config del módulo Extractor -- indicadores que se arman subiendo un Excel crudo
(fila por paciente/evento) cada mes, en vez de un reporte ya formateado del FTP.
Por ahora: EH 03, DM 04 (fuente "extractor" en indicadores/mapeo/EH.json y DM.json).
"""
import json
from pathlib import Path
from configs.settings import DATA_INDICADORES

RUTA_MAPEO = Path(__file__).parent.parent / "mapeo"          # indicadores/mapeo/ (unificado)
RUTA_DATA_INDICADORES = DATA_INDICADORES                      # BD_CIAE/INDICADORES/{año}/{familia}/{FAMILIA}_{NN}.json

MESES_ESTANDAR = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

# Indicadores que usan el motor "extractor" -- un solo Excel mensual (SUI-13 +
# su cruce con Egresos) alimenta a todos al mismo tiempo, cada uno con su
# propia lista de codigos/filtros (ver su bloque "reporte" en indicadores/mapeo/).
INDICADORES_EXTRACTOR = ["EH 03", "DM 04"]

# Meses en los que la periodicidad "Semestral Anualizado" dispara un corte.
MESES_CORTE_SEMESTRAL = ["Junio", "Diciembre"]


def ventana_corte(mes_corte: str, anio: int) -> list[tuple[str, int]]:
    """
    Devuelve los 12 (mes, año) que componen el corte "Semestral Anualizado":
      - corte "Junio":     Julio(anio-1) .. Junio(anio)
      - corte "Diciembre": Enero(anio)   .. Diciembre(anio)
    Cada tupla dice en qué archivo de año buscar ese mes (puede ser el año
    anterior para el corte de Junio).
    """
    if mes_corte == "Junio":
        meses_prev = MESES_ESTANDAR[6:12]   # Julio..Diciembre
        meses_actual = MESES_ESTANDAR[0:6]  # Enero..Junio
        return [(m, anio - 1) for m in meses_prev] + [(m, anio) for m in meses_actual]
    if mes_corte == "Diciembre":
        return [(m, anio) for m in MESES_ESTANDAR]
    raise ValueError(f"Mes de corte desconocido para Semestral Anualizado: {mes_corte!r}")


def ruta_indicador_json(indicador: str, anio: int) -> Path:
    """CACU 01 -> BD_CIAE/INDICADORES/{anio}/CACU/CACU_01.json (misma convencion que el resto)."""
    familia, numero = indicador.split()
    return RUTA_DATA_INDICADORES / str(anio) / familia / f"{familia}_{numero}.json"


def leer_mapeo_indicador(indicador: str) -> dict:
    """Lee el bloque completo del indicador (ej. 'EH 03') desde indicadores/mapeo/{familia}.json."""
    familia = indicador.split()[0]
    ruta = RUTA_MAPEO / f"{familia}.json"
    if not ruta.exists():
        raise FileNotFoundError(f"No existe el mapeo de la familia '{familia}': {ruta}")
    data = json.loads(ruta.read_text(encoding="utf-8"))
    if indicador not in data:
        raise KeyError(f"'{indicador}' no existe en {ruta}")
    return data[indicador]
