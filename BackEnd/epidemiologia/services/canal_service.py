"""
Módulo  : canal_service.py
Carpeta : epidemiologia/services/
Qué hace: Calcula el canal endémico de dengue usando series de tiempo históricas.
Usado en: pipeline_service.py
"""
from epidemiologia.config import AÑO_ACTUAL


def procesar_canal(df, año: int = AÑO_ACTUAL) -> dict:
    from epidemiologia.modulos.series_tiempo import ejecutar_series_tiempo

    df_combinado, alertas = ejecutar_series_tiempo(df, año)

    return {
        "año"         : año,
        "semanas"     : df_combinado["SEM"].tolist(),
        "q1"          : df_combinado["Q1"].tolist(),
        "mediana"     : df_combinado["MEDIANA"].tolist(),
        "q3"          : df_combinado["Q3"].tolist(),
        # astype(object) evita que pandas reconvierta None a NaN (float no
        # admite None); Starlette rechaza NaN en la respuesta JSON.
        "casos_actual": df_combinado["CASOS_ACTUAL"].astype(object).where(df_combinado["CASOS_ACTUAL"].notna(), None).tolist(),
        "zonas"       : df_combinado["ZONA"].astype(object).where(df_combinado["ZONA"].notna(), None).tolist(),
        "alertas"     : alertas,
    }
