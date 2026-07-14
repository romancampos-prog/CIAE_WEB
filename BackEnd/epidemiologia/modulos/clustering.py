import pandas as pd
import numpy as np
import json
import geopandas as gpd
from sklearn.cluster       import DBSCAN
from sklearn.neighbors     import LocalOutlierFactor
from sklearn.preprocessing import MinMaxScaler


# ════════════════════════════════════════════════════════════════════════
# 1. NORMALIZACIÓN DE MUNICIPIOS
# ════════════════════════════════════════════════════════════════════════

def normalizar_municipio(df):
    """
    Crea columna MPO_NORM eliminando el sufijo ' GTO' para
    que coincida con los nombres del GeoJSON.
    """
    df = df.copy()
    df['MPO_NORM'] = (
        df['DES_MPO_RES']
        .str.replace(r'\s+GTO$', '', regex=True)
        .str.strip()
    )
    print(f"Municipios únicos normalizados: {df['MPO_NORM'].nunique()}")
    return df




# ════════════════════════════════════════════════════════════════════════
# 2. VENTANAS DESLIZANTES DE 2 SEMANAS
# ════════════════════════════════════════════════════════════════════════

def construir_ventanas(df):
    """
    Genera ventanas deslizantes de 2 semanas consecutivas a partir de
    las semanas presentes en el DataFrame.
    Ej: semanas [1,2,3,4] → ventanas [(1,2),(2,3),(3,4)]
    """
    semanas  = sorted(df['SEM'].dropna().unique().astype(int))
    ventanas = [(semanas[i], semanas[i + 1]) for i in range(len(semanas) - 1)]
    print(f"Ventanas generadas: {len(ventanas)}")
    return ventanas




# ════════════════════════════════════════════════════════════════════════
# 3. AGREGACIONES
# ════════════════════════════════════════════════════════════════════════

def agregar_por_municipio(df):
    """Cuenta total de casos notificados por municipio."""
    conteo = (
        df.groupby('MPO_NORM')
        .size()
        .reset_index(name='N_CASOS')
    )
    print(f"Municipios con casos: {conteo['N_CASOS'].gt(0).sum()}")
    return conteo




def agregar_por_municipio_confirmados(df):
    """Cuenta casos confirmados (CLASIFICACION_FINAL == 'POSITIVO') por municipio."""
    df_pos = df[df['CLASIFICACION_FINAL'] == 'POSITIVO']
    conteo = (
        df_pos.groupby('MPO_NORM')
        .size()
        .reset_index(name='N_CASOS')
    )
    print(f"Municipios con casos confirmados: {len(conteo)}")
    return conteo




def agregar_por_unidad(df):
    """
    Cuenta total de casos notificados por unidad médica.
    Usado para la tabla de resumen en el mapa interactivo.
    """
    conteo = (
        df.groupby('DES_UNI_MED_NOTIF')
        .size()
        .reset_index(name='N_CASOS')
        .sort_values('N_CASOS', ascending=False)
        .reset_index(drop=True)
    )
    print(f"Unidades médicas con casos: {len(conteo)}")
    return conteo




def agregar_por_unidad_confirmados(df):
    """
    Cuenta casos confirmados (ESTATUS_SISCEP == 'POSITIVO') por unidad médica.
    """
    df_pos = df[df['CLASIFICACION_FINAL'] == 'POSITIVO']
    conteo = (
        df_pos.groupby('DES_UNI_MED_NOTIF')
        .size()
        .reset_index(name='N_CASOS')
        .sort_values('N_CASOS', ascending=False)
        .reset_index(drop=True)
    )
    print(f"Unidades médicas con confirmados: {len(conteo)}")
    return conteo




# ════════════════════════════════════════════════════════════════════════
# 4. CATÁLOGO CP → COORDENADAS
# ════════════════════════════════════════════════════════════════════════

def cargar_catalogo_cp(ruta_catalogo):
    """
    Carga el catálogo CP → coordenadas desde el CSV externo.
    Ruta esperada: datos/catalogos/cp_coordenadas.csv
    """
    df_cp       = pd.read_csv(ruta_catalogo)
    df_cp['CP'] = df_cp['CP'].astype(int)
    print(f"Catálogo CP cargado: {len(df_cp)} códigos postales")
    return df_cp




def asignar_coordenadas(df, df_cp):
    """
    Une el df operativo con el catálogo de CPs para obtener lat/lon.
    Emite advertencia con los CPs sin mapeo para mantenimiento del catálogo.
    """
    df           = df.copy()
    df['CP_INT'] = pd.to_numeric(df['IDE_CP'], errors='coerce').astype('Int64')

    df_coords = df.merge(
        df_cp[['CP', 'LAT', 'LON']],
        left_on  = 'CP_INT',
        right_on = 'CP',
        how      = 'left'
    )

    con_coords = df_coords['LAT'].notna().sum()
    sin_coords = df_coords['LAT'].isna().sum()

    print(f"Casos con coordenadas : {con_coords}")
    print(f"Casos sin coordenadas : {sin_coords}")

    if sin_coords > 0:
        cps_faltantes = (
            df_coords[df_coords['LAT'].isna()]['CP_INT']
            .dropna().unique().tolist()
        )
        if cps_faltantes:
            print(f"⚠ CPs sin mapeo: {sorted(cps_faltantes)}")
            print(f"  → Agregar a datos/catalogos/cp_coordenadas.csv")

    return df_coords




# ════════════════════════════════════════════════════════════════════════
# 5. DETECCIÓN DE BROTES — ANÁLISIS ESPACIAL (DBSCAN + LOF ADAPTATIVO)
# ════════════════════════════════════════════════════════════════════════

def detectar_brotes_dbscan_lof(df_con_coords, ventanas, epsilon_km=2.0):
    """
    Detecta posibles brotes por ventana usando un pipeline de dos etapas:

      Etapa 1 — DBSCAN con distancia Haversine:
        Agrupa CPs geográficamente cercanos (radio = epsilon_km).
        Identifica concentraciones espaciales reales de casos.

      Etapa 2 — LOF adaptativo (score directo):
        En lugar de forzar un porcentaje fijo de anomalías (contamination),
        usa el score de LOF directamente.
        Un CP es anómalo si su score cae por debajo del percentil 25
        de la ventana Y tiene más casos que la mediana de la ventana.
        Esto adapta el umbral a cada ventana sin falsos positivos forzados.

    Criterio de brote:
        en cluster DBSCAN AND score_lof < percentil_25 AND casos > mediana_ventana

    Parámetros:
        epsilon_km — radio en km para considerar dos CPs como vecinos
    """
    RADIO_TIERRA = 6371.0
    epsilon_rad  = epsilon_km / RADIO_TIERRA

    brotes   = []
    df_valid = df_con_coords.dropna(subset=['LAT', 'LON'])

    for (sem1, sem2) in ventanas:
        ventana_str = f"{sem1}-{sem2}"
        grupo = df_valid[df_valid['SEM'].isin([sem1, sem2])]
        if grupo.empty:
            continue

        puntos = (
            grupo.groupby(['CP_INT', 'LAT', 'LON', 'MPO_NORM', 'UBICACION_GEO'])
            .size()
            .reset_index(name='N_CASOS')
        )
        if len(puntos) < 3:
            continue

        # ── Etapa 1: DBSCAN Haversine ────────────────────────────────
        coords_rad = np.radians(puntos[['LAT', 'LON']].values)
        db = DBSCAN(
            eps         = epsilon_rad,
            min_samples = 2,
            metric      = 'haversine'
        ).fit(coords_rad)

        puntos = puntos.copy()
        puntos['CLUSTER_DB'] = db.labels_

        # ── Etapa 2: LOF adaptativo ───────────────────────────────────
        n_vecinos = min(5, len(puntos) - 1)
        scaler    = MinMaxScaler()
        features  = scaler.fit_transform(
            puntos[['LAT', 'LON', 'N_CASOS']].values
        )

        lof = LocalOutlierFactor(n_neighbors=n_vecinos)
        lof.fit_predict(features)

        # Score: más negativo = más anómalo. -1.0 = completamente normal
        scores = lof.negative_outlier_factor_
        puntos['LOF_SCORE'] = scores

        # Umbral adaptativo: percentil 25 de los scores de esta ventana
        umbral_score  = np.percentile(scores, 25)
        mediana_casos = float(puntos['N_CASOS'].median())

        # Brote: en cluster DBSCAN + score anómalo + sobre la mediana
        posibles = puntos[
            (puntos['CLUSTER_DB'] != -1) &
            (puntos['LOF_SCORE']  < umbral_score) &
            (puntos['N_CASOS']    > mediana_casos)
        ]

        for _, row in posibles.iterrows():
            brotes.append({
                'ventana'   : ventana_str,
                'sem_inicio': int(sem1),
                'sem_fin'   : int(sem2),
                'cp'        : int(row['CP_INT']),
                'colonia'   : row['UBICACION_GEO'],
                'municipio' : row['MPO_NORM'],
                'casos'     : int(row['N_CASOS']),
                'lof_score' : round(float(row['LOF_SCORE']), 3),
                'lat'       : float(row['LAT']),
                'lon'       : float(row['LON'])
            })

    if brotes:
        print(f"⚠ Brotes espaciales detectados: {len(brotes)}")
    else:
        print("✓ Sin concentraciones espaciales inusuales detectadas")

    return brotes




# ════════════════════════════════════════════════════════════════════════
# 6. DETECCIÓN DE BROTES — ANÁLISIS TEMPORAL POR COLONIA
# ════════════════════════════════════════════════════════════════════════

def detectar_brotes_temporal(df_con_coords, ventanas):
    """
    Análisis temporal por colonia (CP_INT + UBICACION_GEO).
    Para cada colonia, construye su serie de tiempo de casos por ventana
    y detecta aumentos inusuales respecto a su propio historial.

    El merge se realiza por (CP_INT + UBICACION_GEO + VENTANA_IDX) para
    evitar duplicados cuando un CP tiene múltiples colonias activas.

    Criterio de alerta (deben cumplirse los tres):
      1. casos_actual >= 3            mínimo absoluto antifalsos positivos
      2. al menos 2 ventanas previas  historial suficiente para estadística
      3. casos_actual > media + 2×std umbral de 2 desviaciones estándar

    Caso especial: si std == 0 (historial constante), se usa media × 2.
    """
    MIN_CASOS   = 3
    MIN_PREVIAS = 2
    SIGMA       = 2.0

    df_valid = df_con_coords.dropna(subset=['LAT', 'LON'])

    # ── Construir serie de tiempo por colonia ─────────────────────────
    registros = []
    for idx, (sem1, sem2) in enumerate(ventanas):
        grupo = df_valid[df_valid['SEM'].isin([sem1, sem2])]
        if grupo.empty:
            continue

        conteo = (
            grupo.groupby(
                ['CP_INT', 'UBICACION_GEO', 'LAT', 'LON', 'MPO_NORM']
            )
            .size()
            .reset_index(name='N_CASOS')
        )
        conteo['VENTANA_IDX'] = idx
        conteo['VENTANA']     = f"{sem1}-{sem2}"
        conteo['SEM1']        = sem1
        conteo['SEM2']        = sem2
        registros.append(conteo)

    if not registros:
        return []

    df_series = pd.concat(registros, ignore_index=True)

    # ── Completar con ceros las ventanas sin casos por colonia ────────
    todas_colonias = (
        df_series[['CP_INT', 'UBICACION_GEO', 'LAT', 'LON', 'MPO_NORM']]
        .drop_duplicates()
        .reset_index(drop=True)
    )

    todas_ventanas = pd.DataFrame({
        'VENTANA_IDX': range(len(ventanas)),
        'VENTANA'    : [f"{s1}-{s2}" for s1, s2 in ventanas],
        'SEM1'       : [s1 for s1, s2 in ventanas],
        'SEM2'       : [s2 for s1, s2 in ventanas],
    })

    # Grid completo: cada colonia × cada ventana
    grid = todas_colonias.merge(todas_ventanas, how='cross')

    # Merge por las tres llaves: CP + COLONIA + VENTANA (sin duplicados)
    df_completo = grid.merge(
        df_series[['CP_INT', 'UBICACION_GEO', 'VENTANA_IDX', 'N_CASOS']],
        on  = ['CP_INT', 'UBICACION_GEO', 'VENTANA_IDX'],
        how = 'left'
    )
    df_completo['N_CASOS'] = df_completo['N_CASOS'].fillna(0).astype(int)
    df_completo = df_completo.sort_values(
        ['CP_INT', 'UBICACION_GEO', 'VENTANA_IDX']
    ).reset_index(drop=True)

    # ── Evaluar cada colonia ventana por ventana ──────────────────────
    alertas = []

    for (cp, colonia), grupo_col in df_completo.groupby(
        ['CP_INT', 'UBICACION_GEO']
    ):
        grupo_col = grupo_col.reset_index(drop=True)

        for i, row in grupo_col.iterrows():
            if i < MIN_PREVIAS:
                continue

            actual     = row['N_CASOS']
            anteriores = grupo_col.loc[:i - 1, 'N_CASOS'].values

            if actual < MIN_CASOS:
                continue

            media  = float(np.mean(anteriores))
            std    = float(np.std(anteriores))
            umbral = (media + SIGMA * std) if std > 0 else (
                      media * 2 if media > 0 else MIN_CASOS)

            if actual > umbral:
                alertas.append({
                    'ventana'         : row['VENTANA'],
                    'sem_inicio'      : int(row['SEM1']),
                    'sem_fin'         : int(row['SEM2']),
                    'cp'              : int(cp),
                    'colonia'         : colonia,
                    'municipio'       : row['MPO_NORM'],
                    'casos_actual'    : int(actual),
                    'media_historica' : round(media, 1),
                    'umbral'          : round(umbral, 1),
                    'incremento'      : round(
                        (actual - media) / media * 100, 1
                    ) if media > 0 else 100.0,
                    'lat'             : float(row['LAT']),
                    'lon'             : float(row['LON'])
                })

    if alertas:
        print(f"⚠ Brotes temporales detectados: {len(alertas)}")
    else:
        print("✓ Sin aumentos inusuales por colonia detectados")

    return alertas




# ════════════════════════════════════════════════════════════════════════
# 7. CARGA DE ARCHIVO GEOGRÁFICO
# ════════════════════════════════════════════════════════════════════════

def cargar_geojson(ruta_json):
    """Carga el archivo geográfico y lo convierte a GeoJSON compatible con Leaflet."""
    try:
        gdf = gpd.read_file(ruta_json)
        return json.loads(gdf.to_json())
    except Exception as e:
        raise ValueError(f"No se pudo cargar el archivo geográfico: {e}")




# ════════════════════════════════════════════════════════════════════════
# 8. FUNCIÓN PRINCIPAL
# ════════════════════════════════════════════════════════════════════════

def ejecutar_clustering(df, ruta_json, ruta_catalogo):
    """
    Pipeline completo del módulo de clustering geoespacial.

    Parámetros:
        df            — DataFrame depurado (salida de depuracion.py)
        ruta_json     — ruta al archivo gto_normalizado.json
        ruta_catalogo — ruta al CSV datos/catalogos/cp_coordenadas.csv

    Devuelve un dict con claves:
        geojson         — GeoJSON de Guanajuato (para generador_mapas)
        df_municipio    — conteo por municipio
        df_confirmados  — conteo confirmados por municipio
        df_unidades     — conteo por unidad médica
        df_uni_confirm  — conteo confirmados por unidad médica
        brotes_espacial — lista de alertas DBSCAN + LOF adaptativo
        brotes_temporal — lista de alertas temporales por colonia
    """
    print("=" * 55)
    print("CLUSTERING GEOESPACIAL")
    print("=" * 55)

    print("\n[1] Normalizando municipios...")
    df = normalizar_municipio(df)

    print("\n[2] Construyendo ventanas de 2 semanas...")
    ventanas = construir_ventanas(df)

    print("\n[3] Agregando por municipio y unidad médica...")
    df_municipio   = agregar_por_municipio(df)
    df_confirmados = agregar_por_municipio_confirmados(df)
    df_unidades    = agregar_por_unidad(df)
    df_uni_confirm = agregar_por_unidad_confirmados(df)

    print("\n[4] Cargando catálogo de CPs y asignando coordenadas...")
    df_cp         = cargar_catalogo_cp(ruta_catalogo)
    df_con_coords = asignar_coordenadas(df, df_cp)

    print("\n[5] Detectando brotes — análisis espacial (DBSCAN + LOF adaptativo)...")
    brotes_espacial = detectar_brotes_dbscan_lof(df_con_coords, ventanas)

    print("\n[6] Detectando brotes — análisis temporal por colonia...")
    brotes_temporal = detectar_brotes_temporal(df_con_coords, ventanas)

    print("\n[7] Cargando archivo geográfico...")
    geojson = cargar_geojson(ruta_json)

    print("\n" + "=" * 55)
    print("CLUSTERING COMPLETADO")
    print("=" * 55)

    return {
        'geojson'         : geojson,
        'df_municipio'    : df_municipio,
        'df_confirmados'  : df_confirmados,
        'df_unidades'     : df_unidades,
        'df_uni_confirm'  : df_uni_confirm,
        'brotes_espacial' : brotes_espacial,
        'brotes_temporal' : brotes_temporal,
    }
