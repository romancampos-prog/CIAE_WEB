"""
Como se le muestra al front un par parecido que NO se confirmo como duplicado (para revisarlo
a mano): datos de los dos registros, similitudes y la razon.
Usado en: modulos/dengue/duplicados/deteccion.py
"""
import pandas as pd

from epidemiologia.modulos.dengue.duplicados.similitud import INDICE_FEATURE

_RAZONES_LEGIBLES = {
    'resultado_negativo_previo'    : 'Resultado negativo previo',
    'positivo_mas_14_dias'         : 'Positivo con >14 días de diferencia',
    'diferencia_sintomas_15_dias'  : 'Síntomas con >15 días de diferencia',
    'modelo_no_clasifico'          : 'No confirmado por modelo',
}


def armar_posible_duplicado(row_a, row_b, vec, razon):
    """Construye el dict de un par similar que no fue confirmado como duplicado."""

    def _s(val):
        """Convierte cualquier valor a str Python nativo, vacío si es nulo."""

        if val is None:
            return ''

        try:
            if pd.isna(val):
                return ''
        except (TypeError, ValueError):
            pass

        return str(val).strip()

    def _fec(val):
        try:
            ts = pd.Timestamp(val)
            return '' if pd.isna(ts) else ts.strftime('%Y-%m-%d')
        except Exception:
            return _s(val)

    def _row(row, campo):
        return _s(row.get(campo))

    return {
        'VEC_ID_A'        : _row(row_a, 'VEC_ID'),
        'IDE_NOM_A'       : _row(row_a, 'IDE_NOM'),
        'IDE_APE_PAT_A'   : _row(row_a, 'IDE_APE_PAT'),
        'IDE_APE_MAT_A'   : _row(row_a, 'IDE_APE_MAT'),
        'DES_DIAG_FINAL_A': _row(row_a, 'DES_DIAG_FINAL'),
        'CLASIF_A'        : _row(row_a, 'CLASIFICACION_FINAL'),
        'FEC_NOTIF_A'     : _fec(row_a.get('FEC_NOTIF_EDO')),
        'VEC_ID_B'        : _row(row_b, 'VEC_ID'),
        'IDE_NOM_B'       : _row(row_b, 'IDE_NOM'),
        'IDE_APE_PAT_B'   : _row(row_b, 'IDE_APE_PAT'),
        'IDE_APE_MAT_B'   : _row(row_b, 'IDE_APE_MAT'),
        'DES_DIAG_FINAL_B': _row(row_b, 'DES_DIAG_FINAL'),
        'CLASIF_B'        : _row(row_b, 'CLASIFICACION_FINAL'),
        'FEC_NOTIF_B'     : _fec(row_b.get('FEC_NOTIF_EDO')),
        'SIM_APE_PAT'     : round(float(vec[INDICE_FEATURE['sim_ape_pat']]), 3),
        'SIM_APE_MAT'     : round(float(vec[INDICE_FEATURE['sim_ape_mat']]), 3),
        'SIM_NOMBRE'      : round(float(vec[INDICE_FEATURE['sim_nombre']]),  3),
        'RAZON'           : _RAZONES_LEGIBLES.get(razon, razon or 'No confirmado por modelo'),
    }
