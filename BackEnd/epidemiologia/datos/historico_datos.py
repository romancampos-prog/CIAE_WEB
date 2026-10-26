"""
Historico de dengue (BD_CIAE/EPIDEMIOLOGIA/Dengue/historico/{año}.xlsx) con la semana
epidemiologica de cada caso, para el canal endemico.
Usado en: services/canal_service.py
"""
import os

import pandas as pd

from epidemiologia.config import RUTA_HISTORICO_EPI
from epidemiologia.modulos.fechas import semana_epidemiologica


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

            df_año['SEM'] = df_año['FECHA DE INICIO'].apply(semana_epidemiologica)

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
