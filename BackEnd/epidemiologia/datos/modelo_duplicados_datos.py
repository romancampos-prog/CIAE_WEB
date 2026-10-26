"""
El modelo entrenado de duplicados (epidemiologia/modelos/mlp_duplicados.pkl). Hoy ese archivo
NO existe: la deteccion usa el umbral de similitud. Lo escribe entrenamiento/entrenar_duplicados.py.
Usado en: services/duplicados_service.py, entrenamiento/entrenar_duplicados.py
"""
import os

import joblib

RUTA_MODELO = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    '..', 'modelos', 'mlp_duplicados.pkl'
)


def cargar_modelo_duplicados():
    """El modelo entrenado, o None si todavia no se ha entrenado ninguno."""
    ruta_modelo = os.path.normpath(RUTA_MODELO)

    if not os.path.exists(ruta_modelo):
        return None

    return joblib.load(ruta_modelo)
