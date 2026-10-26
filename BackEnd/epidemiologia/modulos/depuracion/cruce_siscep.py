"""
Paso 5 de la depuracion: cruzar la base operativa con los resultados de laboratorio de SisCep
(por VEC_ID = FOLIO SINAVE) y poner el ESTATUS_SISCEP de cada caso.
Sin lectura ni escritura de archivos: recibe y regresa DataFrames.
"""
import pandas as pd


def cruzar_siscep(df_base, df_siscep):
    """
    Cruza la base operativa con SisCep usando VEC_ID como llave.
    Solo se cruzan registros con MUESTRA_LABORATORIO == 1.

    Lógica de ESTATUS_SISCEP:
        sin muestra       → MUESTRA_LABORATORIO != 1
        sin resultado     → VEC_ID no encontrado en SisCep
        Muestra rechazada → ESTADO MUESTRA == 'Recibida inadecuada'
        Recibida adecuada → ESTADO MUESTRA == 'Recibida adecuada' sin resultado de laboratorio
        <resultado>       → valor en DENGUE TRIPLEX-RT-qPCR o DENGUE IGM
    """

    COL_ESTADO   = 'ESTADO MUESTRA'
    COL_PCR = 'DENGUE TRIPLEX-RT-qPCR'
    COL_IGM      = 'DENGUE IGM'

    # Verificar columnas requeridas en SisCep
    faltantes = [col for col in [COL_ESTADO, COL_PCR, COL_IGM]
                 if col not in df_siscep.columns]

    if faltantes:
        raise ValueError(
            f"SisCep no contiene las columnas requeridas: {faltantes}. "
            f"Columnas disponibles: {list(df_siscep.columns)}"
        )

    # Normalizar VEC_ID en ambas bases
    df_base   = df_base.copy()
    df_siscep = df_siscep.copy()
    df_base['VEC_ID']   = df_base['VEC_ID'].astype(str).str.strip()
    df_siscep['FOLIO SINAVE']    = df_siscep['FOLIO SINAVE'].astype(str).str.strip()
    
    # Separar registros con y sin muestra
    mask_muestra   = df_base['MUESTRA_LABORATORIO'] == 1
    df_con_muestra = df_base[ mask_muestra].copy()
    df_sin_muestra = df_base[~mask_muestra].copy()

    # Cruce solo para registros con muestra
    cols_siscep  = ['FOLIO SINAVE', COL_ESTADO, COL_PCR, COL_IGM]
    df_siscep_ok = df_siscep[cols_siscep].copy()

    # Deduplicar SisCep por FOLIO SINAVE antes del cruce
    duplicados = df_siscep_ok['FOLIO SINAVE'].duplicated().sum()

    if duplicados > 0:
        print(f"  ⚠ {duplicados} folio(s) duplicado(s) en SisCep — se conserva el primero")

    df_siscep_ok = df_siscep_ok.drop_duplicates(subset=['FOLIO SINAVE'], keep='first')

    df_cruzado = df_con_muestra.merge(
        df_siscep_ok,
        left_on  = 'VEC_ID',
        right_on = 'FOLIO SINAVE',
        how      = 'left'
    ).drop(columns=['FOLIO SINAVE'])

    # Aplicar lógica de estatus fila por fila
    def resolver_estatus(row):
        estado  = row.get(COL_ESTADO)
        triplex = row.get(COL_PCR)
        igm     = row.get(COL_IGM)

        # VEC_ID no encontrado en SisCep
        if pd.isna(estado):
            return 'sin resultado'

        estado = str(estado).strip()

        # Muestra rechazada
        if 'inadecuada' in estado.lower():
            return 'Muestra rechazada'

        # Revisar resultados de laboratorio SIEMPRE (PCR prioridad sobre IGM)
        if pd.notna(triplex) and str(triplex).strip() != '':
            return str(triplex).strip()
        if pd.notna(igm) and str(igm).strip() != '':
            return str(igm).strip()

        # Recibida adecuada pero sin resultado aún
        if 'adecuada' in estado.lower():
            return 'Recibida adecuada'

        # Cualquier otro valor en ESTADO MUESTRA
        return estado

    df_cruzado['ESTATUS_SISCEP'] = df_cruzado.apply(resolver_estatus, axis=1)

    # Limpiar columnas temporales de SisCep
    df_cruzado = df_cruzado.drop(columns=[COL_ESTADO, COL_PCR, COL_IGM])

    # Asignar 'sin muestra' a los que no aplica cruce
    df_sin_muestra['ESTATUS_SISCEP'] = 'sin muestra'

    # Reunir ambos grupos
    df_final = pd.concat([df_cruzado, df_sin_muestra], ignore_index=True)

    # Reporte
    conteo = df_final['ESTATUS_SISCEP'].value_counts()
    print("Cruce con SisCep completado:")

    for estatus, cantidad in conteo.items():
        print(f"  {estatus}: {cantidad}")

    return df_final
