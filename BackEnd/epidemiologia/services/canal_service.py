"""
Módulo  : canal_service.py
Carpeta : epidemeologia/services/
Qué hace: Calcula el canal endémico de dengue usando series de tiempo históricas.
Usado en: pipeline_service.py
"""
from epidemiologia.config import AÑO_ACTUAL


def procesar_canal(df, año: int = AÑO_ACTUAL) -> dict:
    from epidemiologia.modulos.series_tiempo import ejecutar_series_tiempo

    df_combinado, alertas = ejecutar_series_tiempo(df)

    return {
        "año"         : año,
        "semanas"     : df_combinado["SEM"].tolist(),
        "q1"          : df_combinado["Q1"].tolist(),
        "mediana"     : df_combinado["MEDIANA"].tolist(),
        "q3"          : df_combinado["Q3"].tolist(),
        "casos_actual": df_combinado["CASOS_ACTUAL"].tolist(),
        "zonas"       : df_combinado["ZONA"].tolist(),
        "alertas"     : alertas,
    }
