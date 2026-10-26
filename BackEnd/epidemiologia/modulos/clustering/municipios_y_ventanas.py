"""
Preparar los casos para el clustering: municipio como viene en el GeoJSON y ventanas
deslizantes de 2 semanas.
Sin lectura ni escritura de archivos: recibe y regresa DataFrames.
"""


def normalizar_municipio(df):
    """
    Crea columna MPO_NORM eliminando el sufijo ' GTO' para
    que coincida con los nombres del GeoJSON.
    """
    df = df.copy()
    df['MPO_NORM'] = (
        df['DES_MPO_RES']
        .str.replace(r'\s+GTO$', '', regex=True)
        .str.strip()
    )
    print(f"Municipios únicos normalizados: {df['MPO_NORM'].nunique()}")
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
