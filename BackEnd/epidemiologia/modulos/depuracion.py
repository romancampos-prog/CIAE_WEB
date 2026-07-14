import pandas as pd

from epidemiologia.modulos.fechas import _inicio_sem1, _numero_semana

# Diagnósticos que cuentan como caso positivo
DIAG_DENGUE = ['DENGUE NO GRAVE', 'DENGUE CON SIGNOS DE ALARMA', 'DENGUE GRAVE']


def cargar_base(ruta_archivo):
    """
    Carga la base de datos operativa desde un archivo de excel.
    ruta_archivo es el parámetro que utiliza la función, es decir,
    la ruta completa al archivo .xlsx
    """

    print(f"Cargando archivo: {ruta_archivo}")

    df = pd.read_excel(ruta_archivo)

    print(f"Registros cargados:  {len(df)}")

    return df



def filtrar_imss_gto(df):
    """
    Filtra unicamente los registros correspondientes al IMSS Guanajuato.
    """

    total_antes = len(df)

    df_filtrado = df[
        (df["CVE_INS_UNIDAD"] == 2) &
        (df["CVE_EDO_UNIDAD"] == 11)
    ].copy()

    total_despues = len(df_filtrado)
    descartados = total_antes - total_despues

    print(f"Registros antes del filtro: {total_antes}")
    print(f"Registros IMSS GUANAJUATO: {total_despues}")
    print(f"Casos descartados: {descartados}")

    return df_filtrado





def limpiar_campos(df):
    """
    En esta función buscaremos estandarizar los campos de texto
    """

    df = df.copy()

    campos_texto = ['IDE_NOM', 'IDE_APE_PAT', 'IDE_APE_MAT', 'CURP',
                    'IDE_COL','DES_MPO_RES']

    for campo in campos_texto:
        if campo in df.columns:
            df[campo] = df[campo].astype(str)
            df[campo] = df[campo].str.upper()
            df[campo] = df[campo].str.strip()
            df[campo] = df[campo].str.normalize('NFKD')\
                        .str.encode('ascii', errors='ignore')\
                        .str.decode('utf-8')
            df[campo] = df[campo].replace('NAN', '')
    print("Limpieza de campos de texto completada")
    
    return df



def asignar_jerarquia_geo(df):
    """
    Asigna la ubicación geográfica del caso usando jerarquía:
    1° IDE_COL (colonia), 2° IDE_CP (código postal), 3° "Sin ubicación"
    Se ejecuta DESPUÉS de limpiar_campos(), por eso los vacíos ya son ''.
    """

    def resolver_ubicacion(row):
        colonia = str(row.get('IDE_COL', '')).strip()
        cp      = str(row.get('IDE_CP',  '')).strip()

        if colonia and colonia != 'NAN':
            return colonia
        elif cp and cp != 'NAN' and cp != '0':
            return cp
        else:
            return 'Sin ubicación'

    df['UBICACION_GEO'] = df.apply(resolver_ubicacion, axis=1)

    sin_ubic = (df['UBICACION_GEO'] == 'Sin ubicación').sum()
    print(f"Jerarquía geográfica asignada. Sin ubicación: {sin_ubic} registros")

    return df




def cargar_siscep(ruta_siscep):
    """
    Carga la base de resultados SisCep proporcionada por el usuario.
    """

    print(f"Cargando SisCep: {ruta_siscep}")
    df_siscep = pd.read_excel(ruta_siscep)

    # Verificar que exista la columna de cruce
    if 'FOLIO SINAVE' not in df_siscep.columns:
        raise ValueError("La base SisCep no contiene la columna 'FOLIO SINAVE'. Verifica el archivo.")

    print(f"SisCep cargada: {len(df_siscep)} registros")
    print(f"Columnas disponibles: {list(df_siscep.columns)}")

    return df_siscep




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




def asignar_semana_epi(df, col_fecha='FEC_INI_SIGNOS_SINT'):
    """
    Calcula la semana epidemiológica (calendario SUIVE) a partir de col_fecha
    y la agrega como columna 'SEM'.
    Fechas anteriores al inicio de la semana 1 del propio año se asignan
    a la última semana del año anterior.
    """

    if col_fecha not in df.columns:
        raise ValueError(f"No se encontró la columna '{col_fecha}' en el DataFrame.")

    df = df.copy()
    df[col_fecha] = pd.to_datetime(df[col_fecha], errors='coerce')

    def _calcular(fecha):
        if pd.isna(fecha):
            return None
        año = fecha.year
        inicio = _inicio_sem1(año)
        if fecha < inicio:
            # Ej: 1-3 ene 2026 pertenecen a la última semana de 2025
            inicio = _inicio_sem1(año - 1)
        return _numero_semana(fecha, inicio)

    df['SEM'] = df[col_fecha].apply(_calcular)

    nulos = df['SEM'].isna().sum()
    print(f"Semana epidemiológica asignada. Sin fecha válida: {nulos} registros")

    return df




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




def depurar_base(ruta_operativa, ruta_siscep=None):
    """
    Función principal del módulo. Ejecuta el pipeline completo de depuración:
    1. Carga la base operativa
    2. Filtra IMSS Guanajuato
    3. Limpia campos de texto
    4. Asigna jerarquía geográfica
    5. Cruza con SisCep (opcional, si se proporciona ruta)
    6. Calcular semana epidemiologica

    Devuelve el DataFrame depurado y listo para los módulos siguientes.
    """

    print("="*50)
    print("INICIANDO DEPURACIÓN DE BASE OPERATIVA")
    print("="*50)

    # Paso 1 — Carga
    df = cargar_base(ruta_operativa)

    # Paso 2 — Filtro institucional
    print("\n[2] Filtrando IMSS Guanajuato...")
    df = filtrar_imss_gto(df)

    # Paso 3 — Limpieza de texto
    print("\n[3] Limpiando campos de texto...")
    df = limpiar_campos(df)

    # Paso 4 — Jerarquía geográfica
    print("\n[4] Asignando ubicación geográfica...")
    df = asignar_jerarquia_geo(df)

    # Paso 5 — Cruce SisCep (opcional)
    if ruta_siscep:
        print("\n[5] Cargando y cruzando SisCep...")
        df_siscep = cargar_siscep(ruta_siscep)
        df = cruzar_siscep(df, df_siscep)
    else:
        print("\n[5] SisCep no proporcionada, se omite el cruce.")
        df['ESTATUS_SISCEP'] = 'sin resultado'

    # Paso 6 — Semana epidemiológica
    print("\n[6] Calculando semana epidemiológica...")
    df = asignar_semana_epi(df)

    # Paso 7 — Clasificación final del caso (SisCep + Dx final)
    print("\n[7] Clasificando caso final...")
    df = clasificar_caso_final(df)

    print("\n" + "="*50)
    print(f"DEPURACIÓN COMPLETADA — {len(df)} registros listos")
    print("="*50)

    df = df.reset_index(drop=True)

    return df