import os
import pandas as pd

from epidemeologia.modulos.fechas import _inicio_sem1, _numero_semana
from configs.settings import RUTA_HISTORICO_EPI


# ─── 1. CARGA DE HISTÓRICO ───────────────────────────────────────────────

def cargar_historico_series():
    """
    Lee todos los archivos en datos/historico/ y los consolida.
    Extrae el año del nombre del archivo.
    Calcula SEM a partir de 'FECHA DE INICIO' usando el calendario SUIVE.
    """

    ruta_hist = str(RUTA_HISTORICO_EPI)

    archivos = [f for f in os.listdir(ruta_hist) if f.endswith('.xlsx')]

    if not archivos:
        raise FileNotFoundError("No se encontraron archivos en datos/historico/")

    def _calcular_sem(fecha):
        if pd.isna(fecha):
            return None
        inicio = _inicio_sem1(fecha.year)
        if fecha < inicio:
            inicio = _inicio_sem1(fecha.year - 1)
        return _numero_semana(fecha, inicio)

    lista_df = []

    for archivo in sorted(archivos):
        año = int(os.path.splitext(archivo)[0])
        ruta_completa = os.path.join(ruta_hist, archivo)

        try:
            df_año = pd.read_excel(ruta_completa)

            if 'FECHA DE INICIO' not in df_año.columns:
                print(f"  ⚠ {archivo}: no se encontró 'FECHA DE INICIO', se omite")
                continue

            df_año['FECHA DE INICIO'] = pd.to_datetime(
                df_año['FECHA DE INICIO'], errors='coerce'
            )

            df_año['SEM'] = df_año['FECHA DE INICIO'].apply(_calcular_sem)

            # ── Resumen de fechas por semana ──────────────────────────
            resumen = (
                df_año.dropna(subset=['SEM'])
                .groupby('SEM')['FECHA DE INICIO']
                .agg(DESDE='min', HASTA='max')
                .reset_index()
            )
            resumen['SEM'] = resumen['SEM'].astype(int)

            print(f"\n  {archivo} — semanas registradas:")
            print(f"  {'SEM':>4}  {'DESDE':>12}  {'HASTA':>12}")
            print(f"  {'-'*32}")
            for _, r in resumen.iterrows():
                print(f"  {r['SEM']:>4}  {r['DESDE'].strftime('%d/%m/%Y'):>12}  {r['HASTA'].strftime('%d/%m/%Y'):>12}")
            # ─────────────────────────────────────────────────────────

            # Descartar registros sin fecha válida
            sin_fecha = df_año['SEM'].isna().sum()
            if sin_fecha > 0:
                print(f"  ⚠ {archivo}: {sin_fecha} registros sin fecha válida, se descartan")
            df_año = df_año.dropna(subset=['SEM'])

            df_año['ANO'] = año
            lista_df.append(df_año[['ANO', 'SEM']])
            print(f"  ✓ {archivo} — {len(df_año)} registros")

        except Exception as e:
            print(f"  ✗ Error leyendo {archivo}: {e}")

    if not lista_df:
        raise RuntimeError(
            "No se pudo cargar ningún archivo histórico de datos/historico/. "
            "Verifica que los archivos tengan la columna 'FECHA DE INICIO'."
        )

    df_historico = pd.concat(lista_df, ignore_index=True)
    print(f"\nHistórico cargado: {len(df_historico)} registros totales")

    return df_historico


# ─── 2. CANAL ENDÉMICO CON CUARTILES ────────────────────────────────────

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


# ─── 3. CASOS AÑO ACTUAL ────────────────────────────────────────────────

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


# ─── 4. DETECCIÓN DE ANOMALÍAS ───────────────────────────────────────────

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


# ─── 5. RESUMEN DE ALERTAS ───────────────────────────────────────────────

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


# ─── 6. FUNCIÓN PRINCIPAL ────────────────────────────────────────────────

def ejecutar_series_tiempo(df_actual):

    print("=" * 50)
    print("SERIES DE TIEMPO — CANAL ENDÉMICO")
    print("=" * 50)

    print("\n[1] Cargando histórico...")
    df_historico = cargar_historico_series()

    print("\n[2] Calculando canal endémico...")
    df_canal = calcular_canal_endemico(df_historico)

    print("\n[3] Preparando año actual...")
    df_actual_sem = preparar_año_actual(df_actual)

    print("\n[4] Detectando anomalías...")
    df_combinado = detectar_anomalias(df_canal, df_actual_sem)

    print("\n[5] Generando resumen de alertas...")
    alertas = generar_resumen_alertas(df_combinado)

    print("\n" + "=" * 50)
    print("SERIES DE TIEMPO COMPLETADO")
    print("=" * 50)

    return df_combinado, alertas