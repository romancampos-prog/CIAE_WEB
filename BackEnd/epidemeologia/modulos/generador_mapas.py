import copy

from reportes.generador_reportes import ensamblar_mapa


# ════════════════════════════════════════════════════════════════════════
# UTILIDADES INTERNAS
# ════════════════════════════════════════════════════════════════════════

def _enriquecer_geojson(geojson, df_conteo, col_municipio='MPO_NORM'):
    """Agrega N_CASOS y NOMBRE a las propiedades del GeoJSON."""
    geojson = copy.deepcopy(geojson)
    lookup  = dict(zip(df_conteo[col_municipio], df_conteo['N_CASOS']))
    for feature in geojson['features']:
        mpo    = feature['properties'].get('MUNICIPIO', '')
        nombre = feature['properties'].get('mun_name', mpo.title())
        feature['properties']['N_CASOS'] = int(lookup.get(mpo, 0))
        feature['properties']['NOMBRE']  = nombre
    return geojson


# ════════════════════════════════════════════════════════════════════════
# PREPARACIÓN DE DATOS
# ════════════════════════════════════════════════════════════════════════

def _preparar_datos_mapa(df_municipio, df_unidades, geojson,
                          año_actual, tipo,
                          brotes_espacial=None, brotes_temporal=None):
    """
    Extrae y estructura los datos necesarios para el mapa interactivo.
    Devuelve un dict listo para pasar a generador_reportes.ensamblar_mapa().
    """
    lookup_mpo = dict(zip(df_municipio['MPO_NORM'], df_municipio['N_CASOS']))

    geo = _enriquecer_geojson(geojson, df_municipio)

    tabla_rows = [
        {'unidad': row['DES_UNI_MED_NOTIF'], 'n': int(row['N_CASOS'])}
        for _, row in df_unidades.iterrows()
        if row['N_CASOS'] > 0
    ]

    return {
        'tipo'            : tipo,
        'año_actual'      : año_actual,
        'geojson'         : geo,
        'tabla_rows'      : tabla_rows,
        'max_casos_mapa'  : max(lookup_mpo.values(), default=1),
        'max_casos_tabla' : max((r['n'] for r in tabla_rows), default=1),
        'total'           : sum(r['n'] for r in tabla_rows),
        'mun_con_casos'   : sum(1 for v in lookup_mpo.values() if v > 0),
        'brotes_espacial' : brotes_espacial or [],
        'brotes_temporal' : brotes_temporal or [],
    }


# ════════════════════════════════════════════════════════════════════════
# API PÚBLICA
# ════════════════════════════════════════════════════════════════════════

def generar_mapa_interactivo(df_municipio, df_unidades, geojson,
                              año_actual=2026, tipo='situacion',
                              ruta_salida=None,
                              brotes_espacial=None, brotes_temporal=None):
    """
    Genera un mapa HTML interactivo standalone con Leaflet.

    Parámetros:
        df_municipio    — conteo por municipio (para colorear el mapa)
        df_unidades     — conteo por unidad médica (para la tabla inferior)
        geojson         — GeoJSON de municipios de Guanajuato
        año_actual      — año en curso
        tipo            — 'situacion' | 'confirmados'
        ruta_salida     — carpeta donde guardar el HTML (opcional)
        brotes_espacial — lista de brotes DBSCAN+LOF de clustering.py
        brotes_temporal — lista de alertas temporales de clustering.py

    Devuelve el HTML como string.
    """
    datos = _preparar_datos_mapa(
        df_municipio, df_unidades, geojson, año_actual, tipo,
        brotes_espacial, brotes_temporal,
    )
    return ensamblar_mapa(datos, ruta_salida)
