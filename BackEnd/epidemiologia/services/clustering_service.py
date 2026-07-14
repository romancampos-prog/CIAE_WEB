"""
Módulo  : clustering_service.py
Carpeta : epidemiologia/services/
Qué hace: Ejecuta el análisis de clustering geoespacial sobre los casos de dengue.
Usado en: pipeline_service.py
"""
from epidemiologia.config import RUTA_GTO_JSON, RUTA_CATALOGO_EPI


def procesar_clustering(df) -> dict:
    from epidemiologia.modulos.clustering import ejecutar_clustering

    return ejecutar_clustering(df, str(RUTA_GTO_JSON), str(RUTA_CATALOGO_EPI))
