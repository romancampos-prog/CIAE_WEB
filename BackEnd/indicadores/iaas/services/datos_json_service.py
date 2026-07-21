"""
Acceso centralizado a los JSON de IAAS: los datos por año (IAAS_0N.json) y el
JSON estático de configuración/umbrales por indicador.
Usado en: generar_iaas.py, procesar_service.py, info_service.py,
          iaas/controllers/iaas_controller.py, reportes_controller.py
"""
import json
from iaas.config import RUTA_DATA_IAAS, RUTA_IAAS_JSON


def leer_indicador_anio(anio: str, ind_n: int) -> dict:
    """JSON completo de IAAS_0N para ese año. {} si no existe o no se puede leer."""
    ruta = RUTA_DATA_IAAS / str(anio) / f"IAAS_0{ind_n}.json"
    if not ruta.exists():
        return {}
    try:
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[IAAS JSON] Error leyendo {ruta}: {e}")
        return {}


def escribir_indicador_anio(anio: str, ind_n: int, data: dict) -> None:
    """Guarda el JSON completo de IAAS_0N para ese año, creando la carpeta si falta."""
    ruta = RUTA_DATA_IAAS / str(anio)
    ruta.mkdir(parents=True, exist_ok=True)
    with open(ruta / f"IAAS_0{ind_n}.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def leer_config_iaas() -> dict:
    """JSON estático con título, descripciones y umbrales de cada indicador."""
    with open(RUTA_IAAS_JSON, "r", encoding="utf-8") as f:
        return json.load(f)