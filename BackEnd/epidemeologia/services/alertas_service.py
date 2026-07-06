"""
Módulo  : alertas_service.py
Carpeta : epidemeologia/services/
Qué hace: Procesa alertas del SisCep — muestras rechazadas, pendientes, graves sin muestra.
Usado en: pipeline_service.py
"""

COLS_CASO = ["VEC_ID", "DES_UNI_MED_NOTIF", "IDE_NOM",
             "IDE_APE_PAT", "IDE_APE_MAT", "DES_DIAG_PROBABLE", "SEM"]

COLS_PEND = ["VEC_ID", "DES_UNI_MED_NOTIF", "IDE_NOM",
             "IDE_APE_PAT", "IDE_APE_MAT", "ESTATUS_SISCEP", "SEM"]


def _df_to_records(df, columnas):
    cols_existentes = [c for c in columnas if c in df.columns]
    return df[cols_existentes].fillna("").astype(str).to_dict(orient="records")


def procesar_alertas(df, año: int) -> dict:
    from epidemeologia.modulos.alertas import ejecutar_alertas_siscep

    resultado   = ejecutar_alertas_siscep(df)
    tabla_neg   = resultado["tabla_negativos"]
    negativos   = tabla_neg.to_dict(orient="records") if not tabla_neg.empty else []

    return {
        "año"                  : año,
        "muestras_rechazadas"  : _df_to_records(resultado["muestras_rechazadas"],  COLS_CASO),
        "pendientes_clasificar": _df_to_records(resultado["pendientes_clasificar"], COLS_PEND),
        "recibidas_adecuadas"  : _df_to_records(resultado["recibidas_adecuadas"],  COLS_CASO),
        "sin_muestra"          : _df_to_records(resultado["sin_muestra"],           COLS_CASO),
        "graves_sin_muestra"   : _df_to_records(resultado["graves_sin_muestra"],    COLS_CASO),
        "tabla_negativos"      : negativos,
    }
