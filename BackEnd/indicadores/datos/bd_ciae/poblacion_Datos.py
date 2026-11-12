"""
BD_CIAE/POBLACION_INFOSALUD/POBLACION_{año}.json: la poblacion de Guanajuato por unidad que
ya se cargo del Excel nacional, y el mes/año del reporte del que salio.
Usado en: services/poblacion/*, services/ftp/*, services/extractor/corte_semestral_Services.py,
          datos/excel_subido/excel_poblacion_Datos.py
"""
import datetime
import json
from pathlib import Path

from configs.settings import DATA_POBLACION_INFOSALUD


def ruta_poblacion(anio: str | int | None = None) -> Path:
    """POBLACION_{anio}.json; si no se especifica año, el año en curso."""
    return DATA_POBLACION_INFOSALUD / f"POBLACION_{anio or datetime.date.today().year}.json"


##--------------------------------------

def leer_poblacion(anio: str | int | None) -> dict:
    ruta = ruta_poblacion(anio)
    if not ruta.exists():
        return {}
    with open(ruta, encoding="utf-8") as f:
        return json.load(f)


##--------------------------------------

def leer_periodo_poblacion(anio: str | int | None = None) -> tuple[str | None, int | None]:
    """Mes/año detectado del titulo del reporte vigente, o (None, None) si no hay o no se pudo detectar al subirla."""
    datos = leer_poblacion(anio)
    return datos.get("MES_DETECTADO"), datos.get("ANIO_DETECTADO")


##--------------------------------------

def texto_poblacion_vigente(anio: str | int | None) -> str | None:
    """"Mes Año" de la poblacion vigente, para dejar registrado con que poblacion se calculo cada mes."""
    mes, anio_detectado = leer_periodo_poblacion(anio)
    return f"{mes} {anio_detectado}" if mes and anio_detectado else None


##--------------------------------------

def guardar_poblacion(anio: str | int | None, contenido: dict) -> None:
    """Escribe POBLACION_{anio}.json (reemplaza el que hubiera)."""
    ruta = ruta_poblacion(anio)
    ruta.parent.mkdir(parents=True, exist_ok=True)

    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(contenido, f, indent=2, ensure_ascii=False)
