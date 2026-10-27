"""
Vector de similitud de dos registros (14 valores): parecido de nombres, diferencias de fechas
y lo que dicen las reglas de negocio. Lo usan la deteccion y el entrenamiento del modelo.
Usado en: modulos/dengue/duplicados/deteccion.py, modulos/dengue/duplicados/formato_posibles.py, entrenamiento/
"""
import jellyfish
import numpy as np
import pandas as pd

from epidemiologia.modulos.dengue.duplicados.campos_registro import (
    DIFF_DIAS_MAX, dias_entre_notificaciones, nivel_diagnostico, ordenar_por_fecha_notificacion, texto_limpio, tiene_resultado,
)
from epidemiologia.modulos.dengue.duplicados.excepciones import (
    excepcion_diferencia_sintomas, excepcion_positivo_14_dias, excepcion_resultado_negativo,
)

NOMBRES_FEATURES = [
    'sim_nombre', 'sim_ape_pat', 'sim_ape_mat',
    'soundex_pat', 'soundex_mat',
    'diff_sintomas', 'diff_notif',
    'primero_negativo', 'ambos_resultado',
    'excepcion_negativo', 'excepcion_14dias', 'excepcion_sintomas',
    'uno_con_resultado', 'diff_severidad'
]

# Índice rápido por nombre de feature (módulo-nivel para reusar en helpers)
INDICE_FEATURE = {nombre: i for i, nombre in enumerate(NOMBRES_FEATURES)}


def calcular_vector(row_a, row_b):
    """
    Vector de similitud enriquecido con outputs de reglas de negocio (14 features).

    Similitud de nombres [0-4]:
      sim_nombre, sim_ape_pat, sim_ape_mat, soundex_pat, soundex_mat

    Temporales [5-6]:
      diff_sintomas  — diferencia FEC_INI_SIGNOS_SINT normalizada (0-1)
      diff_notif     — diferencia FEC_NOTIF_EDO normalizada (0-1)

    Reglas de negocio [7-13]:
      primero_negativo  — 1 si el más antiguo tiene resultado OTROS
      ambos_resultado   — 1 si ambos tienen DES_DIAG_FINAL
      excepcion_negativo — output de excepcion_resultado_negativo()
      excepcion_14dias   — output de excepcion_positivo_14_dias()
      excepcion_sintomas — output de excepcion_diferencia_sintomas()
      uno_con_resultado  — 1 si exactamente uno tiene DES_DIAG_FINAL
      diff_severidad     — diferencia absoluta de nivel diagnóstico normalizada
    """

    # ── Similitud de nombres [0-4] ────────────────────────────────────
    nom_a = texto_limpio(row_a.get('IDE_NOM'))
    nom_b = texto_limpio(row_b.get('IDE_NOM'))
    pat_a = texto_limpio(row_a.get('IDE_APE_PAT'))
    pat_b = texto_limpio(row_b.get('IDE_APE_PAT'))
    mat_a = texto_limpio(row_a.get('IDE_APE_MAT'))
    mat_b = texto_limpio(row_b.get('IDE_APE_MAT'))

    sim_nombre  = jellyfish.jaro_winkler_similarity(nom_a, nom_b) if nom_a and nom_b else 0.0
    sim_ape_pat = jellyfish.jaro_winkler_similarity(pat_a, pat_b) if pat_a and pat_b else 0.0
    sim_ape_mat = jellyfish.jaro_winkler_similarity(mat_a, mat_b) if mat_a and mat_b else 0.0
    soundex_pat = 1.0 if (pat_a and pat_b and
                          jellyfish.soundex(pat_a) == jellyfish.soundex(pat_b)) else 0.0
    soundex_mat = 1.0 if (mat_a and mat_b and
                          jellyfish.soundex(mat_a) == jellyfish.soundex(mat_b)) else 0.0

    # ── Diferencia síntomas [5] ───────────────────────────────────────
    try:
        sa = pd.Timestamp(row_a['FEC_INI_SIGNOS_SINT']) if pd.notna(
            row_a.get('FEC_INI_SIGNOS_SINT')) else None
        sb = pd.Timestamp(row_b['FEC_INI_SIGNOS_SINT']) if pd.notna(
            row_b.get('FEC_INI_SIGNOS_SINT')) else None
        diff_sint = min(abs((sa - sb).days), DIFF_DIAS_MAX) / DIFF_DIAS_MAX \
                    if sa and sb else 0.5
    except Exception:
        diff_sint = 0.5

    # ── Diferencia notificación [6] ───────────────────────────────────
    dias_notif = dias_entre_notificaciones(row_a, row_b)
    diff_notif = min(dias_notif, DIFF_DIAS_MAX) / DIFF_DIAS_MAX \
                 if dias_notif is not None else 0.5

    # ── Features de resultado [7-8] ───────────────────────────────────
    primero, _    = ordenar_por_fecha_notificacion(row_a, row_b)
    prim_negativo = 1.0 if texto_limpio(primero.get('DES_DIAG_FINAL', '')) == 'OTROS' else 0.0
    ambos_result  = 1.0 if (tiene_resultado(row_a) and tiene_resultado(row_b)) else 0.0

    # ── Outputs de excepciones [9-11] ────────────────────────────────
    f_exc_neg  = 1.0 if excepcion_resultado_negativo(row_a, row_b)  else 0.0
    f_exc_14   = 1.0 if excepcion_positivo_14_dias(row_a, row_b)    else 0.0
    f_exc_sint = 1.0 if excepcion_diferencia_sintomas(row_a, row_b) else 0.0

    # ── Uno con resultado [12] ────────────────────────────────────────
    uno_resultado = 1.0 if (tiene_resultado(row_a) ^ tiene_resultado(row_b)) else 0.0

    # ── Diferencia de severidad [13] ─────────────────────────────────
    diff_severidad = abs(nivel_diagnostico(row_a) - nivel_diagnostico(row_b)) / 2.0

    return np.array([
        sim_nombre, sim_ape_pat, sim_ape_mat, soundex_pat, soundex_mat,
        diff_sint, diff_notif,
        prim_negativo, ambos_result,
        f_exc_neg, f_exc_14, f_exc_sint,
        uno_resultado, diff_severidad
    ])
