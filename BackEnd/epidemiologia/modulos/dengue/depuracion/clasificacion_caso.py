"""
Paso 7 de la depuracion: CLASIFICACION_FINAL de cada caso (POSITIVO / NEGATIVO / SIN CLASIFICAR)
con el resultado de SisCep y, si no hay, el diagnostico final.
Sin lectura ni escritura de archivos: recibe y regresa DataFrames.
"""

# Diagnósticos que cuentan como caso positivo
DIAG_DENGUE = ['DENGUE NO GRAVE', 'DENGUE CON SIGNOS DE ALARMA', 'DENGUE GRAVE']


def clasificar_caso_final(df):
    """
    Crea la columna CLASIFICACION_FINAL combinando el resultado SisCep
    con el diagnóstico final, para la clasificación epidemiológica del caso.

    Prioridad:
      1. Resultado de laboratorio SisCep (POSITIVO / NEGATIVO)
      2. Si no hay resultado SisCep, usar DES_DIAG_FINAL:
           - OTROS                    → NEGATIVO
           - Dengue (cualquier tipo)  → POSITIVO
      3. Si no hay ninguno            → SIN CLASIFICAR
    """

    df = df.copy()

    def _clasificar(row):
        estatus = str(row.get('ESTATUS_SISCEP', '')).upper().strip()
        diag    = str(row.get('DES_DIAG_FINAL', '')).upper().strip()

        # Prioridad 1: resultado de laboratorio SisCep
        if estatus == 'POSITIVO':
            return 'POSITIVO'
        if estatus == 'NEGATIVO':
            return 'NEGATIVO'

        # Prioridad 2: diagnóstico final
        if diag in DIAG_DENGUE:
            return 'POSITIVO'
        if diag == 'OTROS':
            return 'NEGATIVO'

        return 'SIN CLASIFICAR'

    df['CLASIFICACION_FINAL'] = df.apply(_clasificar, axis=1)

    conteo = df['CLASIFICACION_FINAL'].value_counts()
    print("Clasificación final del caso:")

    for clasif, cant in conteo.items():
        print(f"  {clasif}: {cant}")

    return df
