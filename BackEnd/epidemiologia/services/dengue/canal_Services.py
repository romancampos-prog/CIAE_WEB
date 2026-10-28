"""
Canal endemico de dengue: historico (datos/historico_Datos.py) contra los casos del año, y la
respuesta para el front.
Usado en: services/dengue/pipeline/pasos_pipeline_Services.py
"""
from epidemiologia.config import AÑO_ACTUAL
from epidemiologia.datos.dengue.historico_Datos import cargar_historico_series
from epidemiologia.modulos.dengue.canal_endemico import (
    calcular_canal_endemico, detectar_anomalias, generar_resumen_alertas, preparar_año_actual,
)


def ejecutar_series_tiempo(df_actual):

    print("=" * 50)
    print("SERIES DE TIEMPO — CANAL ENDÉMICO")
    print("=" * 50)

    print("\n[1] Cargando histórico...")
    df_historico = cargar_historico_series()

    print("\n[2] Calculando canal endémico...")
    df_canal = calcular_canal_endemico(df_historico)

    print("\n[3] Preparando año actual...")
    df_actual_sem = preparar_año_actual(df_actual)

    print("\n[4] Detectando anomalías...")
    df_combinado = detectar_anomalias(df_canal, df_actual_sem)

    print("\n[5] Generando resumen de alertas...")
    alertas = generar_resumen_alertas(df_combinado)

    print("\n" + "=" * 50)
    print("SERIES DE TIEMPO COMPLETADO")
    print("=" * 50)

    return df_combinado, alertas


##--------------------------------------

def procesar_canal(df, año: int = AÑO_ACTUAL) -> dict:
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
