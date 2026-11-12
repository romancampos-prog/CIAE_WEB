"""
Paso 2 de la depuracion: quedarse solo con los registros del IMSS Guanajuato.
Sin lectura ni escritura de archivos: recibe y regresa DataFrames.
"""


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
