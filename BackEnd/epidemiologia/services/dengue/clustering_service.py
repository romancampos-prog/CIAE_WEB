"""
Clustering geoespacial: conteos por municipio y unidad, coordenadas por CP, brotes espaciales
y temporales, y el GeoJSON de Guanajuato (de datos/catalogos_geo_datos.py).
Usado en: services/dengue/pipeline/pasos_pipeline_service.py
"""
from epidemiologia.config import RUTA_CATALOGO_EPI, RUTA_GTO_JSON
from epidemiologia.datos.dengue.catalogos_geo_datos import cargar_catalogo_cp, cargar_geojson
from epidemiologia.modulos.dengue.clustering.brotes_espaciales import detectar_brotes_dbscan_lof
from epidemiologia.modulos.dengue.clustering.brotes_temporales import detectar_brotes_temporal
from epidemiologia.modulos.dengue.clustering.conteo_casos import contar_casos
from epidemiologia.modulos.dengue.clustering.coordenadas_cp import asignar_coordenadas
from epidemiologia.modulos.dengue.clustering.municipios_y_ventanas import construir_ventanas, normalizar_municipio


def ejecutar_clustering(df, ruta_json, ruta_catalogo):
    """
    Pipeline completo del módulo de clustering geoespacial.

    Parámetros:
        df            — DataFrame depurado (salida de depuracion.py)
        ruta_json     — ruta al archivo gto_normalizado.json
        ruta_catalogo — ruta al CSV datos/catalogos/cp_coordenadas.csv

    Devuelve un dict con claves:
        geojson         — GeoJSON de Guanajuato (para mapa_service)
        df_municipio    — conteo por municipio
        df_confirmados  — conteo confirmados por municipio
        df_unidades     — conteo por unidad médica
        df_uni_confirm  — conteo confirmados por unidad médica
        brotes_espacial — lista de alertas DBSCAN + LOF adaptativo
        brotes_temporal — lista de alertas temporales por colonia
    """

    print("=" * 55)
    print("CLUSTERING GEOESPACIAL")
    print("=" * 55)

    print("\n[1] Normalizando municipios...")
    df = normalizar_municipio(df)

    print("\n[2] Construyendo ventanas de 2 semanas...")
    ventanas = construir_ventanas(df)

    print("\n[3] Agregando por municipio y unidad médica...")
    df_municipio   = contar_casos(df, 'MPO_NORM')
    df_confirmados = contar_casos(df, 'MPO_NORM', solo_confirmados=True)
    df_unidades    = contar_casos(df, 'DES_UNI_MED_NOTIF', ordenar=True)
    df_uni_confirm = contar_casos(df, 'DES_UNI_MED_NOTIF', solo_confirmados=True, ordenar=True)

    print("\n[4] Cargando catálogo de CPs y asignando coordenadas...")
    df_cp         = cargar_catalogo_cp(ruta_catalogo)
    df_con_coords = asignar_coordenadas(df, df_cp)

    print("\n[5] Detectando brotes — análisis espacial (DBSCAN + LOF adaptativo)...")
    brotes_espacial = detectar_brotes_dbscan_lof(df_con_coords, ventanas)

    print("\n[6] Detectando brotes — análisis temporal por colonia...")
    brotes_temporal = detectar_brotes_temporal(df_con_coords, ventanas)

    print("\n[7] Cargando archivo geográfico...")
    geojson = cargar_geojson(ruta_json)

    print("\n" + "=" * 55)
    print("CLUSTERING COMPLETADO")
    print("=" * 55)

    return {
        'geojson'         : geojson,
        'df_municipio'    : df_municipio,
        'df_confirmados'  : df_confirmados,
        'df_unidades'     : df_unidades,
        'df_uni_confirm'  : df_uni_confirm,
        'brotes_espacial' : brotes_espacial,
        'brotes_temporal' : brotes_temporal,
    }


##--------------------------------------

def procesar_clustering(df) -> dict:
    return ejecutar_clustering(df, str(RUTA_GTO_JSON), str(RUTA_CATALOGO_EPI))
