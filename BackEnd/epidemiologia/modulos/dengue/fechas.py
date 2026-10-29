"""
Calendario de semana epidemiologica SUIVE: inicio de la semana 1 de un año, numero de semana
y la semana de una fecha (la usan la depuracion de la base y el historico del canal endemico).
Usado en: modulos/dengue/depuracion/asignar_semana.py, datos/dengue/historico_Datos.py
"""
import pandas as pd


def _inicio_sem1(año):
    """
    Primer día de la semana epidemiológica 1 (calendario SUIVE/México).

    Regla: la semana 1 es aquella con al menos 4 días dentro del año nuevo.
      - 1 ene en dom-mié (≥ 4 días restantes en la semana): semana 1 inicia el 1 de enero
        (puede ser una semana parcial de 4-7 días).
      - 1 ene en jue-sáb (≤ 3 días restantes): esos días pertenecen al año anterior;
        la semana 1 inicia el siguiente domingo.

    Ejemplos:
      2025 → 1 ene = miércoles → semana 1 inicia 01/01/2025 (4 días: mié-sáb)
      2026 → 1 ene = jueves    → semana 1 inicia 04/01/2026 (domingo siguiente)
    """
    ene1 = pd.Timestamp(año, 1, 1)
    dow  = ene1.dayofweek          # 0=lun … 5=sáb, 6=dom

    # Días que la semana (dom-sáb) tiene dentro del nuevo año contando desde ene1
    dias_en_año = 7 if dow == 6 else 6 - dow

    if dias_en_año >= 4:
        return ene1                                       # semana 1 inicia el 1 de enero
    else:
        return ene1 + pd.Timedelta(days=6 - dow)         # siguiente domingo


##--------------------------------------

def _numero_semana(fecha, inicio_sem1):
    """
    Devuelve el número de semana dado el inicio de la semana 1.
    Maneja correctamente el caso de semana 1 parcial (cuando inicia en lun-mié).
    """
    dow_s1 = inicio_sem1.dayofweek   # 6=dom (semana completa) | 0-2=lun-mié (parcial)

    if dow_s1 == 6:
        # Semana 1 completa: todas las semanas son de 7 días
        return int((fecha - inicio_sem1).days // 7) + 1
    else:
        # Semana 1 parcial: termina el sábado de esa misma semana
        primer_domingo = inicio_sem1 + pd.Timedelta(days=6 - dow_s1)
        if fecha < primer_domingo:
            return 1                                      # aún dentro de la semana parcial
        return int((fecha - primer_domingo).days // 7) + 2


##--------------------------------------

def año_epidemiologico_actual() -> int:
    """El año epidemiologico de hoy: del 1 de enero al inicio de la semana 1 todavia cuenta el año anterior."""

    hoy = pd.Timestamp.today().normalize()
    return hoy.year if hoy >= _inicio_sem1(hoy.year) else hoy.year - 1


##--------------------------------------

def semana_epidemiologica(fecha):
    """
    Semana SUIVE de una fecha; None si no hay fecha. Las fechas anteriores al inicio de la
    semana 1 de su año son de la ultima semana del año anterior (ej. 1-3 ene 2026 -> 2025).
    """

    if pd.isna(fecha):
        return None

    inicio = _inicio_sem1(fecha.year)

    if fecha < inicio:
        inicio = _inicio_sem1(fecha.year - 1)

    return _numero_semana(fecha, inicio)
