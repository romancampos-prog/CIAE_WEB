"""
Paso 6 de la depuracion: semana epidemiologica (columna SEM) de cada caso.
Sin lectura ni escritura de archivos: recibe y regresa DataFrames.
"""
import pandas as pd

from epidemiologia.modulos.fechas import semana_epidemiologica


def asignar_semana_epi(df, col_fecha='FEC_INI_SIGNOS_SINT'):
    """
    Calcula la semana epidemiológica (calendario SUIVE) a partir de col_fecha
    y la agrega como columna 'SEM'.
    Fechas anteriores al inicio de la semana 1 del propio año se asignan
    a la última semana del año anterior.
    """

    if col_fecha not in df.columns:
        raise ValueError(f"No se encontró la columna '{col_fecha}' en el DataFrame.")

    df = df.copy()
    df[col_fecha] = pd.to_datetime(df[col_fecha], errors='coerce')

    df['SEM'] = df[col_fecha].apply(semana_epidemiologica)

    nulos = df['SEM'].isna().sum()
    print(f"Semana epidemiológica asignada. Sin fecha válida: {nulos} registros")

    return df
