"""
Resultados del pipeline en BD_CIAE/EPIDEMIOLOGIA/Dengue/resultados/{clave}.json (para que
sobrevivan a un reinicio del servidor) y la fecha del ultimo reporte.
Usado en: services/dengue/pipeline/*
"""
import json

import numpy as np

from epidemiologia.config import RUTA_PIPELINE_ESTADO, RUTA_RESULTADOS_EPI


class _NumpyEncoder(json.JSONEncoder):
    """Convierte tipos numpy a tipos Python nativos para serialización JSON."""
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()

        return super().default(obj)


CLAVES_RESULTADOS = ("canal", "mapa", "alertas", "duplicados", "posibles_duplicados")


##--------------------------------------

def _ruta(clave: str):
    return RUTA_RESULTADOS_EPI / f"{clave}.json"


##--------------------------------------

def guardar_resultados(resultados: dict) -> None:
    """Escribe cada resultado que no sea None en su JSON."""
    RUTA_RESULTADOS_EPI.mkdir(parents=True, exist_ok=True)

    for clave, valor in resultados.items():
        if valor is not None:
            _ruta(clave).write_text(
                json.dumps(valor, ensure_ascii=False, cls=_NumpyEncoder),
                encoding="utf-8",
            )


##--------------------------------------

def cargar_resultados() -> dict:
    """{clave: resultado guardado} de las 5 claves; None en las que no tienen archivo (o esta danado)."""
    resultados = {clave: None for clave in CLAVES_RESULTADOS}

    if not RUTA_RESULTADOS_EPI.exists():
        return resultados

    for clave in CLAVES_RESULTADOS:
        ruta = _ruta(clave)

        if ruta.exists():
            try:
                resultados[clave] = json.loads(ruta.read_text(encoding="utf-8"))
            except Exception:
                pass

    return resultados


##--------------------------------------

def cargar_ultimo_reporte() -> str | None:
    try:
        return json.loads(RUTA_PIPELINE_ESTADO.read_text(encoding="utf-8")).get("ultimo_reporte")
    except Exception:
        return None


##--------------------------------------

def guardar_ultimo_reporte(fecha: str):
    try:
        RUTA_PIPELINE_ESTADO.parent.mkdir(parents=True, exist_ok=True)
        RUTA_PIPELINE_ESTADO.write_text(json.dumps({"ultimo_reporte": fecha}), encoding="utf-8")
    except Exception:
        pass
