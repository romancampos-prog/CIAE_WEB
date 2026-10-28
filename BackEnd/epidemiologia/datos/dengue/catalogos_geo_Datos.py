"""
Catalogos geograficos del mapeo (epidemiologia/mapeo/): codigos postales con su latitud y
longitud, y el GeoJSON de los municipios de Guanajuato.
Usado en: services/dengue/clustering_Services.py
"""
import json

import geopandas as gpd
import pandas as pd


def cargar_catalogo_cp(ruta_catalogo):
    """
    Carga el catálogo CP → coordenadas desde el CSV externo.
    Ruta esperada: datos/catalogos/cp_coordenadas.csv
    """
    df_cp       = pd.read_csv(ruta_catalogo)
    df_cp['CP'] = df_cp['CP'].astype(int)
    print(f"Catálogo CP cargado: {len(df_cp)} códigos postales")
    return df_cp


##--------------------------------------

def cargar_geojson(ruta_json):
    """Carga el archivo geográfico y lo convierte a GeoJSON compatible con Leaflet."""

    try:
        gdf = gpd.read_file(ruta_json)
        return json.loads(gdf.to_json())
    except Exception as e:
        raise ValueError(f"No se pudo cargar el archivo geográfico: {e}")
