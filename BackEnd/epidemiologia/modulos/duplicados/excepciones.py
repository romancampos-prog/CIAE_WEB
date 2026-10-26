"""
Cuando dos registros parecidos NO son duplicado (re-notificacion valida): resultado negativo
previo, positivo con mas de 14 dias o sintomas con mas de 15 dias de diferencia.
Usado en: modulos/duplicados/deteccion.py, modulos/duplicados/similitud.py
"""
import pandas as pd

from epidemiologia.modulos.duplicados.campos_registro import (
    DIAS_POSITIVO, UMBRAL_SINT_DIAS, dias_entre_notificaciones, ordenar_por_fecha_notificacion, texto_limpio, tiene_resultado,
)


def excepcion_resultado_negativo(row_a, row_b):
    """
    EXCEPCIÓN 1 — Resultado negativo previo.
    Si el primer registro notificado tiene resultado OTROS (negativo),
    el paciente puede re-notificarse sin que se considere duplicado.
    """
    primero, _ = ordenar_por_fecha_notificacion(row_a, row_b)
    return texto_limpio(primero.get('DES_DIAG_FINAL', '')) == 'OTROS'


##--------------------------------------

def excepcion_positivo_14_dias(row_a, row_b):
    """
    EXCEPCIÓN 2 — Resultado positivo con más de 14 días de diferencia.
    Si el primer registro tiene resultado positivo y han pasado más de
    14 días, es un episodio nuevo y no se considera duplicado.
    """
    primero, _ = ordenar_por_fecha_notificacion(row_a, row_b)
    dias        = dias_entre_notificaciones(row_a, row_b)

    if dias is None:
        return False

    if tiene_resultado(primero):
        diag = texto_limpio(primero.get('DES_DIAG_FINAL', ''))
        if diag != 'OTROS' and dias > DIAS_POSITIVO:
            return True

    return False


##--------------------------------------

def excepcion_diferencia_sintomas(row_a, row_b):
    """
    EXCEPCIÓN 3 — Diferencia en inicio de síntomas mayor a 15 días.
    Si las fechas de inicio de signos y síntomas difieren más de
    UMBRAL_SINT_DIAS días, son episodios clínicos distintos.
    """

    try:
        sa = pd.Timestamp(row_a['FEC_INI_SIGNOS_SINT']) if pd.notna(
            row_a.get('FEC_INI_SIGNOS_SINT')) else None
        sb = pd.Timestamp(row_b['FEC_INI_SIGNOS_SINT']) if pd.notna(
            row_b.get('FEC_INI_SIGNOS_SINT')) else None
        if sa and sb:
            return abs((sa - sb).days) > UMBRAL_SINT_DIAS
    except Exception:
        pass

    return False


##--------------------------------------

def aplicar_excepciones(row_a, row_b):
    """
    Ejecuta todas las excepciones en orden.
    Devuelve (True, nombre) si alguna aplica, (False, None) si no.
    """

    if excepcion_resultado_negativo(row_a, row_b):
        return True, 'resultado_negativo_previo'
    if excepcion_positivo_14_dias(row_a, row_b):
        return True, 'positivo_mas_14_dias'
    if excepcion_diferencia_sintomas(row_a, row_b):
        return True, 'diferencia_sintomas_15_dias'

    return False, None
