"""
Latitud y longitud de cada caso por su codigo postal (con el catalogo de CPs ya cargado).
Sin lectura ni escritura de archivos: recibe y regresa DataFrames.
"""
import pandas as pd


def asignar_coordenadas(df, df_cp):
    """
    Une el df operativo con el catálogo de CPs para obtener lat/lon.
    Emite advertencia con los CPs sin mapeo para mantenimiento del catálogo.
    """

    df           = df.copy()
    df['CP_INT'] = pd.to_numeric(df['IDE_CP'], errors='coerce').astype('Int64')

    df_coords = df.merge(
        df_cp[['CP', 'LAT', 'LON']],
        left_on  = 'CP_INT',
        right_on = 'CP',
        how      = 'left'
    )

    con_coords = df_coords['LAT'].notna().sum()
    sin_coords = df_coords['LAT'].isna().sum()

    print(f"Casos con coordenadas : {con_coords}")
    print(f"Casos sin coordenadas : {sin_coords}")

    if sin_coords > 0:
        cps_faltantes = (
            df_coords[df_coords['LAT'].isna()]['CP_INT']
            .dropna().unique().tolist()
        )

        if cps_faltantes:
            print(f"⚠ CPs sin mapeo: {sorted(cps_faltantes)}")
            print(f"  → Agregar a datos/catalogos/cp_coordenadas.csv")

    return df_coords
