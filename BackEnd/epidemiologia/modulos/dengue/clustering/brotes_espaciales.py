"""
Posibles brotes por concentracion espacial en cada ventana de 2 semanas: DBSCAN (distancia
Haversine) + LOF adaptativo.
Sin lectura ni escritura de archivos: recibe y regresa DataFrames.
"""
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import MinMaxScaler


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
