"""
Duplicados del pipeline: detectar (con el modelo entrenado si existe), y armar la tabla de los
registros eliminados con los datos del paciente para el front.
Usado en: services/dengue/pipeline/pasos_pipeline_Services.py
"""
import json

import pandas as pd

from epidemiologia.datos.dengue.modelo_duplicados_Datos import cargar_modelo_duplicados
from epidemiologia.modulos.dengue.duplicados.deteccion import detectar_duplicados

_COLS_PACIENTE = [
    'VEC_ID', 'IDE_NOM', 'IDE_APE_PAT', 'IDE_APE_MAT', 'CURP',
    'DES_UNI_MED_NOTIF',
    'FEC_INI_SIGNOS_SINT', 'FEC_NOTIF_EDO',
    'DES_DIAG_PROBABLE', 'DES_DIAG_FINAL',
    'MUESTRA_LABORATORIO', 'ESTATUS_SISCEP', 'CLASIFICACION_FINAL',
]


def _tabla_eliminados(df_pre_dedup, eliminados: list[dict]) -> list[dict]:
    """Los registros eliminados con sus datos del paciente y con que registro se quedo cada uno."""

    if not eliminados:
        return []

    cols_disp = [c for c in _COLS_PACIENTE if c in df_pre_dedup.columns]
    df_elim = pd.DataFrame(eliminados)
    df_info = df_pre_dedup[cols_disp].copy()
    df_info['VEC_ID']            = df_info['VEC_ID'].astype(str)
    df_elim['VEC_ID_ELIMINADO']  = df_elim['VEC_ID_ELIMINADO'].astype(str)
    df_elim['VEC_ID_CONSERVADO'] = df_elim['VEC_ID_CONSERVADO'].astype(str)

    df_rechazados = df_info.merge(
        df_elim[['VEC_ID_ELIMINADO', 'VEC_ID_CONSERVADO', 'METODO']],
        left_on='VEC_ID', right_on='VEC_ID_ELIMINADO', how='inner'
    ).drop(columns=['VEC_ID_ELIMINADO'])

    return json.loads(df_rechazados.to_json(orient='records', date_format='iso', force_ascii=False))


##--------------------------------------

def procesar_duplicados(df):
    """(df sin duplicados, tabla de eliminados, posibles duplicados no confirmados)."""

    # 1. Detectar (con el modelo entrenado si existe; si no, umbral de similitud)
    df_pre_dedup = df.copy()
    df_limpio, eliminados, posibles = detectar_duplicados(df, cargar_modelo_duplicados())

    # 2. Tabla de los eliminados para el front
    return df_limpio, _tabla_eliminados(df_pre_dedup, eliminados), posibles
