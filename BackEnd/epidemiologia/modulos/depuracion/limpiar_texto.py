"""
Paso 3 de la depuracion: nombres, CURP, colonia y municipio en mayusculas, sin acentos ni espacios de mas.
Sin lectura ni escritura de archivos: recibe y regresa DataFrames.
"""


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
