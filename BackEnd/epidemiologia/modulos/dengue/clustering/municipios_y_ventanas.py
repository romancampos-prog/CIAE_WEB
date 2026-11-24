"""
Preparar los casos para el clustering: municipio (de residencia y de la unidad) como viene en el
GeoJSON y ventanas deslizantes de 2 semanas.
Sin lectura ni escritura de archivos: recibe y regresa DataFrames.
"""

# SINAVE escribe algunos municipios distinto que el GeoJSON (ya sin el sufijo ' GTO')
EQUIVALENCIAS_MUNICIPIO = {
    'ALLENDE': 'SAN MIGUEL DE ALLENDE',
}


def _nombre_como_geojson(columna):
    """Quita el sufijo ' GTO' y aplica EQUIVALENCIAS_MUNICIPIO para que coincida con el GeoJSON."""
    sin_sufijo = (
        columna.astype(str)
        .str.upper()
        .str.replace(r'\s+GTO$', '', regex=True)
        .str.strip()
    )
    return sin_sufijo.replace(EQUIVALENCIAS_MUNICIPIO)


##--------------------------------------

def normalizar_municipio(df):
    """
    Crea MPO_NORM (de DES_MPO_RES, donde vive el paciente) y MPO_UNIDAD_NORM (de DES_MPO_UNIDAD,
    donde esta la unidad que notifico), con los nombres del GeoJSON.
    """
    df = df.copy()
    df['MPO_NORM']        = _nombre_como_geojson(df['DES_MPO_RES'])
    df['MPO_UNIDAD_NORM'] = _nombre_como_geojson(df['DES_MPO_UNIDAD'])

    print(f"Municipios de residencia normalizados: {df['MPO_NORM'].nunique()}")
    print(f"Municipios de unidad normalizados: {df['MPO_UNIDAD_NORM'].nunique()}")
    return df


##--------------------------------------

def construir_ventanas(df):
    """
    Genera ventanas deslizantes de 2 semanas consecutivas a partir de
    las semanas presentes en el DataFrame.
    Ej: semanas [1,2,3,4] → ventanas [(1,2),(2,3),(3,4)]
    """
    semanas  = sorted(df['SEM'].dropna().unique().astype(int))
    ventanas = [(semanas[i], semanas[i + 1]) for i in range(len(semanas) - 1)]
    print(f"Ventanas generadas: {len(ventanas)}")
    return ventanas
