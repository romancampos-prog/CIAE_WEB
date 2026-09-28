"""
Guardado y lectura del historico del motor Extractor en BD_CIAE -- exclusivo de
Extractor porque su formato tiene DOS bloques en el mismo archivo: "MESES" (dato
crudo mensual, siempre desempeno "Gris") y "CORTES.MESES" (el corte semestral ya
calculado y semaforizado, ver corte_extractor_Services.py). No es el mismo formato
que bd_Ciae_Guardado_Services.py (ese solo maneja "MESES" con resultado final).
Usado en: services/extractor/generacion_extractor_Services.py, services/extractor/corte_extractor_Services.py
"""
import json
from pathlib import Path

from configs.settings import DATA_INDICADORES
from shared.unidades_ftp import NOMBREUNIDADESARCHIVO


def ruta_indicador_json(indicador: str, anio: int) -> Path:
    """EH 03 -> BD_CIAE/INDICADORES/{anio}/EH/EH_03.json (misma convencion que el resto)."""
    familia, numero = indicador.split()
    return DATA_INDICADORES / str(anio) / familia / f"{familia}_{numero}.json"


def leer_reporte(indicador: str, anio: int) -> dict:
    ruta = ruta_indicador_json(indicador, anio)
    if ruta.exists():
        return json.loads(ruta.read_text(encoding="utf-8"))
    return {"INDICADOR": indicador, "ANIO": anio, "MESES": {}}


def guardar_reporte(indicador: str, anio: int, reporte: dict) -> None:
    ruta = ruta_indicador_json(indicador, anio)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(json.dumps(reporte, ensure_ascii=False, indent=2), encoding="utf-8")


def guardar_numerador_mes(indicador: str, anio: int, mes_nombre: str, conteo_por_unidad: dict) -> None:
    """
    Guarda (o reemplaza, si se re-sube el mismo mes) el numerador crudo de un
    mes -- siempre con las 46 unidades (mismo orden que NOMBREUNIDADESARCHIVO),
    las que no tuvieron ningun caso ese mes quedan en 0, no ausentes.

    "MESES" es SIEMPRE el dato crudo del mes, incluso para un mes de corte
    (Junio/Diciembre) -- el corte calculado se guarda aparte en "CORTES.MESES"
    (ver corte_extractor_Services.intentar_generar_corte), nunca sobreescribe
    esto. Asi un mes de corte (ej. Junio) puede seguir siendo parte de la
    ventana del SIGUIENTE corte (Diciembre del mismo año) sin arrastrar un
    acumulado disfrazado de mes suelto.
    """
    reporte = leer_reporte(indicador, anio)
    reporte["MESES"][mes_nombre] = {
        unidad: {"numerador": conteo_por_unidad.get(unidad, 0), "desempeno": "Gris"}
        for unidad in NOMBREUNIDADESARCHIVO
    }
    guardar_reporte(indicador, anio, reporte)
