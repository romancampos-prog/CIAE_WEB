"""
Lo que las reglas de duplicados leen de un registro: texto limpio, si tiene resultado o
muestra, nivel del diagnostico y las fechas de notificacion de dos registros.
Usado en: modulos/dengue/duplicados/*, entrenamiento/entrenar_duplicados.py
"""
import pandas as pd

JERARQUIA_DIAG = {
    'DENGUE GRAVE'                : 3,
    'DENGUE CON SIGNOS DE ALARMA' : 2,
    'DENGUE NO GRAVE'             : 1,
    'OTROS'                       : 0,
}

DIFF_DIAS_MAX    = 60

UMBRAL_SINT_DIAS = 15

DIAS_POSITIVO    = 14


def texto_limpio(val):
    if pd.isna(val):
        return ''
    return str(val).strip().upper()


##--------------------------------------

def tiene_resultado(row):
    return bool(texto_limpio(row.get('DES_DIAG_FINAL', '')))


##--------------------------------------

def tiene_muestra(row):
    try:
        return int(row.get('MUESTRA_LABORATORIO', 0)) == 1
    except Exception:
        return False


##--------------------------------------

def nivel_diagnostico(row):
    diag = texto_limpio(row.get('DES_DIAG_PROBABLE', ''))
    return JERARQUIA_DIAG.get(diag, 0)


##--------------------------------------

def ordenar_por_fecha_notificacion(row_a, row_b):
    try:
        fa = pd.Timestamp(row_a['FEC_NOTIF_EDO']) if pd.notna(
            row_a.get('FEC_NOTIF_EDO')) else None
        fb = pd.Timestamp(row_b['FEC_NOTIF_EDO']) if pd.notna(
            row_b.get('FEC_NOTIF_EDO')) else None
        if fa and fb:
            return (row_a, row_b) if fa <= fb else (row_b, row_a)
    except Exception:
        pass

    return row_a, row_b


##--------------------------------------

def dias_entre_notificaciones(row_a, row_b):
    try:
        fa = pd.Timestamp(row_a['FEC_NOTIF_EDO']) if pd.notna(
            row_a.get('FEC_NOTIF_EDO')) else None
        fb = pd.Timestamp(row_b['FEC_NOTIF_EDO']) if pd.notna(
            row_b.get('FEC_NOTIF_EDO')) else None
        if fa and fb:
            return abs((fa - fb).days)
    except Exception:
        pass

    return None
