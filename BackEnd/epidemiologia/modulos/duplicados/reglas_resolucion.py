"""
Cual de los dos registros duplicados se elimina: 6 reglas en orden de prioridad y, si ninguna
decide, el de notificacion mas reciente.
Usado en: modulos/duplicados/deteccion.py
"""
import pandas as pd

from epidemiologia.modulos.duplicados.campos_registro import (
    nivel_diagnostico, ordenar_por_fecha_notificacion, tiene_muestra, tiene_resultado,
)


def regla_uno_con_resultado(row_a, row_b):
    """
    REGLA 1 — Solo uno tiene resultado o clasificación final.
    Conservar el que tiene DES_DIAG_FINAL. Eliminar el que no tiene.
    """
    tiene_a = tiene_resultado(row_a)
    tiene_b = tiene_resultado(row_b)

    if tiene_a and not tiene_b:
        return row_b['VEC_ID']
    if tiene_b and not tiene_a:
        return row_a['VEC_ID']

    return None


##--------------------------------------

def regla_uno_con_muestra(row_a, row_b):
    """
    REGLA 2 — Solo uno tiene muestra de laboratorio (ninguno tiene DES_DIAG_FINAL aún).
    Conservar el que tiene muestra. Eliminar el que no tiene.
    """

    if tiene_resultado(row_a) or tiene_resultado(row_b):
        return None

    tiene_a = tiene_muestra(row_a)
    tiene_b = tiene_muestra(row_b)

    if tiene_a and not tiene_b:
        return row_b['VEC_ID']
    if tiene_b and not tiene_a:
        return row_a['VEC_ID']

    return None


##--------------------------------------

def regla_mayor_severidad_sin_resultado(row_a, row_b):
    """
    REGLA 3 — Ambos con muestra, sin resultado final, distinto diagnóstico probable.
    Conservar el de mayor severidad (DES_DIAG_PROBABLE).
    Cubre: mismo día con distinta severidad, y días distintos con distinta severidad.
    """

    if tiene_resultado(row_a) or tiene_resultado(row_b):
        return None
    if not (tiene_muestra(row_a) and tiene_muestra(row_b)):
        return None

    nivel_a = nivel_diagnostico(row_a)
    nivel_b = nivel_diagnostico(row_b)

    if nivel_a > nivel_b:
        return row_b['VEC_ID']
    if nivel_b > nivel_a:
        return row_a['VEC_ID']

    return None


##--------------------------------------

def regla_ambos_con_resultado(row_a, row_b):
    """
    REGLA 4 — Ambos tienen resultado.
    Conservar el de FEC_NOTIF_EDO más antigua. Eliminar el más reciente.
    """

    if not (tiene_resultado(row_a) and tiene_resultado(row_b)):
        return None

    try:
        fa = pd.Timestamp(row_a['FEC_NOTIF_EDO']) if pd.notna(
            row_a.get('FEC_NOTIF_EDO')) else None
        fb = pd.Timestamp(row_b['FEC_NOTIF_EDO']) if pd.notna(
            row_b.get('FEC_NOTIF_EDO')) else None
        if fa and fb and fa != fb:
            return row_b['VEC_ID'] if fa < fb else row_a['VEC_ID']
    except Exception:
        pass

    return None


##--------------------------------------

def regla_misma_fecha_ambos_resultado(row_a, row_b):
    """
    REGLA 5 — Ambos con resultado y misma fecha de notificación.
    Conservar mayor severidad: Dengue Grave > D. Signos Alarma > Dengue No Grave.
    """

    if not (tiene_resultado(row_a) and tiene_resultado(row_b)):
        return None

    nivel_a = nivel_diagnostico(row_a)
    nivel_b = nivel_diagnostico(row_b)

    if nivel_a > nivel_b:
        return row_b['VEC_ID']
    if nivel_b > nivel_a:
        return row_a['VEC_ID']

    return max(row_a['VEC_ID'], row_b['VEC_ID'])


##--------------------------------------

def regla_sin_muestra(row_a, row_b):
    """
    REGLA 6 — Ninguno tiene muestra de laboratorio.
    Conservar MENOR severidad: Dengue No Grave > D. Signos Alarma > Dengue Grave.
    """

    if tiene_muestra(row_a) or tiene_muestra(row_b):
        return None

    nivel_a = nivel_diagnostico(row_a)
    nivel_b = nivel_diagnostico(row_b)

    if nivel_a < nivel_b:
        return row_b['VEC_ID']
    if nivel_b < nivel_a:
        return row_a['VEC_ID']

    return max(row_a['VEC_ID'], row_b['VEC_ID'])


##--------------------------------------

def aplicar_reglas_resolucion(row_a, row_b):
    """
    Aplica las reglas de resolución en orden de prioridad.
    Devuelve el VEC_ID del registro a ELIMINAR.
    """

    for regla in [regla_uno_con_resultado,
                  regla_uno_con_muestra,
                  regla_mayor_severidad_sin_resultado,
                  regla_ambos_con_resultado,
                  regla_misma_fecha_ambos_resultado,
                  regla_sin_muestra]:
        resultado = regla(row_a, row_b)
        if resultado:
            return resultado

    _, segundo = ordenar_por_fecha_notificacion(row_a, row_b)
    return segundo['VEC_ID']
