import pandas as pd

# Diagnósticos considerados graves (muestra obligatoria)
DIAG_GRAVES = ['DENGUE GRAVE', 'DENGUE CON SIGNOS DE ALARMA']


def _norm(serie):
    """Normaliza texto a mayúsculas sin espacios para comparaciones."""
    return serie.astype(str).str.upper().str.strip()


# ════════════════════════════════════════════════════════════════════════
# FUNCIONES DE CÁLCULO — cada una devuelve un DataFrame filtrado
# ════════════════════════════════════════════════════════════════════════

def alerta_muestras_rechazadas(df):
    """
    ALERTA 1 — Muestras rechazadas.
    Registros cuya muestra fue rechazada por el laboratorio.
    Acción: debe retomarse una nueva muestra al paciente.
    """
    return df[_norm(df['ESTATUS_SISCEP']) == 'MUESTRA RECHAZADA'].copy()




def alerta_pendientes_clasificacion(df):
    """
    ALERTA 2 — Pendientes de clasificación con resultado disponible.
    Hay resultado en SisCep (POSITIVO o NEGATIVO) pero el diagnóstico
    final en la base operativa sigue vacío.
    Acción: clasificar el caso con el resultado ya disponible.
    """
    estatus      = _norm(df['ESTATUS_SISCEP'])
    tiene_result = estatus.isin(['POSITIVO', 'NEGATIVO'])
    # pd.isna() captura NaN real; el .isin() cubre strings vacíos/NONE residuales
    sin_diag_fin = df['DES_DIAG_FINAL'].isna() | _norm(df['DES_DIAG_FINAL']).isin(['', 'NONE'])
    return df[tiene_result & sin_diag_fin].copy()




def alerta_recibidas_adecuadas(df):
    """
    ALERTA 3 — Recibidas adecuadas pendientes de resultado.
    La muestra llegó correctamente al laboratorio pero aún no tiene resultado.
    Acción: dar seguimiento al laboratorio para obtener el resultado.
    """
    return df[_norm(df['ESTATUS_SISCEP']) == 'RECIBIDA ADECUADA'].copy()




def alerta_sin_muestra(df):
    """
    ALERTA 4 — Sin muestra de laboratorio (valor 0 o nulo).
    Cualquier caso de dengue sin muestra registrada, sin importar el
    diagnóstico probable.
    Acción: valorar la toma de muestra según el caso.
    """
    muestra = pd.to_numeric(df['MUESTRA_LABORATORIO'], errors='coerce')
    return df[muestra.isna() | (muestra == 0)].copy()




def alerta_graves_sin_muestra(df):
    """
    ALERTA 5 — Casos graves con valor 2 en MUESTRA_LABORATORIO (PRIORITARIA).
    Dengue con Signos de Alarma o Dengue Grave donde la muestra está
    marcada con valor 2 (no tomada). En casos graves la muestra es
    obligatoria.
    Acción: toma de muestra urgente.
    """
    muestra  = pd.to_numeric(df['MUESTRA_LABORATORIO'], errors='coerce')
    es_grave = _norm(df['DES_DIAG_PROBABLE']).isin(DIAG_GRAVES)
    return df[es_grave & (muestra == 2)].copy()




def tabla_negativos_por_unidad(df):
    """
    TABLA DE NEGATIVOS POR UNIDAD MÉDICA.
    Casos con resultado negativo, identificados por:
        DES_DIAG_FINAL == 'OTROS'  O  ESTATUS_SISCEP == 'NEGATIVO'
    Agrupados por unidad médica notificante.
    """
    diag_final = _norm(df['DES_DIAG_FINAL'])
    estatus    = _norm(df['ESTATUS_SISCEP'])
    negativos  = df[(diag_final == 'OTROS') | (estatus == 'NEGATIVO')].copy()

    if negativos.empty:
        return pd.DataFrame(columns=['DES_UNI_MED_NOTIF', 'N_NEGATIVOS'])

    return (
        negativos.groupby('DES_UNI_MED_NOTIF')
        .size()
        .reset_index(name='N_NEGATIVOS')
        .sort_values('N_NEGATIVOS', ascending=False)
        .reset_index(drop=True)
    )




def ejecutar_alertas_siscep(df):
    """
    Ejecuta todas las alertas SisCep y devuelve un diccionario con
    los DataFrames de cada una más la tabla de negativos.
    """
    print("=" * 50)
    print("ALERTAS SISCEP")
    print("=" * 50)

    resultado = {
        'muestras_rechazadas'   : alerta_muestras_rechazadas(df),
        'pendientes_clasificar' : alerta_pendientes_clasificacion(df),
        'recibidas_adecuadas'   : alerta_recibidas_adecuadas(df),
        'sin_muestra'           : alerta_sin_muestra(df),
        'graves_sin_muestra'    : alerta_graves_sin_muestra(df),
        'tabla_negativos'       : tabla_negativos_por_unidad(df),
    }

    print(f"  Alerta 1 — Muestras rechazadas        : {len(resultado['muestras_rechazadas'])}")
    print(f"  Alerta 2 — Pendientes de clasificación: {len(resultado['pendientes_clasificar'])}")
    print(f"  Alerta 3 — Recibidas adecuadas        : {len(resultado['recibidas_adecuadas'])}")
    print(f"  Alerta 4 — Sin muestra                : {len(resultado['sin_muestra'])}")
    print(f"  Alerta 5 — Graves sin muestra (PRIOR) : {len(resultado['graves_sin_muestra'])}")
    print(f"  Tabla negativos por unidad            : {len(resultado['tabla_negativos'])} unidades")

    return resultado
