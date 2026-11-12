"""
Posibles brotes por aumento inusual de casos en una colonia contra su propio historial
(media + 2 desviaciones estandar).
Sin lectura ni escritura de archivos: recibe y regresa DataFrames.
"""
import numpy as np
import pandas as pd


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
