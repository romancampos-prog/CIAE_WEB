"""
Canal endemico por cuartiles: canal historico por semana, casos del año actual, zona de cada
semana (exito / seguridad / alerta / epidemica) y las semanas anomalas.
Sin lectura ni escritura de archivos: recibe y regresa DataFrames.
"""
import pandas as pd


def calcular_canal_endemico(df_historico):
    """
    Calcula el canal endémico por semana usando cuartiles.
    Las semanas sin casos en un año se cuentan como CERO.

    Zonas:
        Éxito:     0        → Q1
        Seguridad: Q1       → Mediana
        Alerta:    Mediana  → Q3
        Epidémica: Q3       → arriba

    Devuelve DataFrame con columnas: SEM, Q1, MEDIANA, Q3
    """

    años    = sorted(df_historico['ANO'].unique())
    max_sem = int(df_historico['SEM'].dropna().max())
    semanas = list(range(1, min(max_sem, 52) + 1))

    if max_sem == 53:
        semanas.append(53)

    # Grid completo años × semanas para incluir ceros
    grid = pd.DataFrame(
        [(año, sem) for año in años for sem in semanas],
        columns=['ANO', 'SEM']
    )

    casos_reales = (
        df_historico
        .groupby(['ANO', 'SEM'])
        .size()
        .reset_index(name='CASOS')
    )

    casos_completo = grid.merge(casos_reales, on=['ANO', 'SEM'], how='left')
    casos_completo['CASOS'] = casos_completo['CASOS'].fillna(0)

    canal = (
        casos_completo
        .groupby('SEM')['CASOS']
        .agg(
            Q1      = lambda x: x.quantile(0.25),
            MEDIANA = 'median',
            Q3      = lambda x: x.quantile(0.75)
        )
        .reset_index()
    )

    print(f"Canal endémico calculado — {len(canal)} semanas (ceros incluidos)")

    return canal


##--------------------------------------

def preparar_año_actual(df_actual):
    """
    Recibe el DataFrame depurado (salida de depuracion.py).
    Cuenta casos por semana epidemiológica.
    """

    if 'SEM' not in df_actual.columns:
        raise ValueError("El DataFrame no contiene la columna 'SEM'.")

    casos_actual = (
        df_actual
        .groupby('SEM')
        .size()
        .reset_index(name='CASOS_ACTUAL')
    )

    print(f"Año actual: {len(casos_actual)} semanas con casos registrados")
    return casos_actual


##--------------------------------------

def detectar_anomalias(df_canal, df_actual):
    """
    Cruza el canal endémico con los casos del año actual.
    Clasifica cada semana en su zona epidemiológica:
        exito | seguridad | alerta | epidemica
    """

    df = df_canal.merge(df_actual, on='SEM', how='left')
    df['CASOS_ACTUAL'] = df['CASOS_ACTUAL'].fillna(0)

    def clasificar_zona(row):
        c = row['CASOS_ACTUAL']

        if c <= row['Q1']:
            return 'exito'
        elif c <= row['MEDIANA']:
            return 'seguridad'
        elif c <= row['Q3']:
            return 'alerta'
        else:
            return 'epidemica'

    df['ZONA'] = df.apply(clasificar_zona, axis=1)

    print("Clasificación por zona:")

    for zona, conteo in df['ZONA'].value_counts().items():
        print(f"  {zona}: {conteo} semanas")

    return df


##--------------------------------------

def generar_resumen_alertas(df_combinado):
    """
    Extrae las semanas en zona de alerta o epidémica.
    Devuelve una lista de dicts con:
        - sem: número de semana
        - casos: casos registrados
        - umbral: valor histórico superado
        - zona: 'alerta' o 'epidemica'
    Si no hay semanas anómalas, devuelve lista vacía.
    """

    zonas_anomalas = ['alerta', 'epidemica']
    df_anomalas = df_combinado[df_combinado['ZONA'].isin(zonas_anomalas)].copy()

    if df_anomalas.empty:
        print("✓ Sin semanas anómalas detectadas")
        return []

    alertas = []

    for _, row in df_anomalas.iterrows():
        # El umbral superado depende de la zona:
        # alerta    → superó la MEDIANA
        # epidémica → superó el Q3
        umbral = row['MEDIANA'] if row['ZONA'] == 'alerta' else row['Q3']

        alertas.append({
            'sem'   : int(row['SEM']),
            'casos' : int(row['CASOS_ACTUAL']),
            'umbral': round(umbral, 1),
            'zona'  : row['ZONA']
        })

    print(f"⚠ {len(alertas)} semanas anómalas detectadas")

    return alertas
