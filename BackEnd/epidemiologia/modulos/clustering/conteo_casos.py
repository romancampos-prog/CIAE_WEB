"""
Conteo de casos por municipio o por unidad medica, todos o solo los confirmados (para el mapa).
Sin lectura ni escritura de archivos: recibe y regresa DataFrames.
"""


def contar_casos(df, columna, solo_confirmados=False, ordenar=False):
    """
    Casos por 'columna' (MPO_NORM o DES_UNI_MED_NOTIF) en N_CASOS. solo_confirmados: solo
    CLASIFICACION_FINAL == 'POSITIVO'. ordenar: de mas a menos casos (la tabla de unidades del mapa).
    """

    if solo_confirmados:
        df = df[df['CLASIFICACION_FINAL'] == 'POSITIVO']

    conteo = df.groupby(columna).size().reset_index(name='N_CASOS')

    if ordenar:
        conteo = conteo.sort_values('N_CASOS', ascending=False).reset_index(drop=True)

    print(f"Con casos por {columna}{' (confirmados)' if solo_confirmados else ''}: {len(conteo)}")
    return conteo
