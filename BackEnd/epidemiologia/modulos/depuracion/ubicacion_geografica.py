"""
Paso 4 de la depuracion: ubicacion de cada caso por jerarquia (colonia, codigo postal o "Sin ubicación").
Sin lectura ni escritura de archivos: recibe y regresa DataFrames.
"""


def asignar_jerarquia_geo(df):
    """
    Asigna la ubicación geográfica del caso usando jerarquía:
    1° IDE_COL (colonia), 2° IDE_CP (código postal), 3° "Sin ubicación"
    Se ejecuta DESPUÉS de limpiar_campos(), por eso los vacíos ya son ''.
    """

    def resolver_ubicacion(row):
        colonia = str(row.get('IDE_COL', '')).strip()
        cp      = str(row.get('IDE_CP',  '')).strip()

        if colonia and colonia != 'NAN':
            return colonia
        elif cp and cp != 'NAN' and cp != '0':
            return cp
        else:
            return 'Sin ubicación'

    df['UBICACION_GEO'] = df.apply(resolver_ubicacion, axis=1)

    sin_ubic = (df['UBICACION_GEO'] == 'Sin ubicación').sum()
    print(f"Jerarquía geográfica asignada. Sin ubicación: {sin_ubic} registros")

    return df
