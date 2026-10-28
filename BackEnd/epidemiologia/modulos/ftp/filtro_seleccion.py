"""
Modo FILTRO_SELECCION: de una hoja del reporte se quedan las filas que cumplen filtroColumna y,
de esas, solo las columnas de 'seleccionar' (con su nombre). Regresa filas, no un numero.
Usado en: services/ftp/ftpExtraer.py
"""
import pandas as pd

from compartido.extraccion_excel.columnas_excel import letra_a_numero
from epidemiologia.schemas.model.accionesAchivo_Dto import Archivo


def filtro_seleccion(df: pd.DataFrame, config: Archivo) -> list[dict]:
    """
    @param df     - la hoja cruda (header=None, todo como texto)
    @param config - el bloque del archivo en el mapeo (encabezado en numero de fila de Excel, 1 = primera)
    @returns una lista de {nombre de columna: valor} por cada fila que pasa el filtro
    """

    # 1. Confirmar que cada letra del mapeo trae el encabezado esperado
    fila_encabezado = config.encabezado - 1
    _validar_encabezados(df, fila_encabezado, config)

    datos = df.iloc[fila_encabezado + 1:]

    # 2. Filtrar: todas las columnas de filtroColumna deben cumplirse
    for letra, filtro in config.filtroColumna.items():
        if filtro.tipo != "LISTA":
            raise ValueError(f"Filtro '{filtro.tipo}' en la columna {letra} sin implementacion (solo LISTA).")

        columna = datos.iloc[:, letra_a_numero(letra)].str.strip()
        datos = datos[columna.isin(filtro.filtro)]

    # 3. Quedarse con las columnas de 'seleccionar', con su nombre
    posiciones = [letra_a_numero(letra) for letra in config.seleccionar]
    seleccion = datos.iloc[:, posiciones]
    seleccion.columns = list(config.seleccionar.values())

    # las celdas vacias llegan como NaN y JSON no las acepta
    seleccion = seleccion.astype(object).where(seleccion.notna(), None)

    return seleccion.to_dict(orient="records")


##--------------------------------------

def _validar_encabezados(df: pd.DataFrame, fila_encabezado: int, config: Archivo) -> None:
    """Si una letra no trae su nombreColumna, el archivo no es el esperado (o cambio de formato)."""

    esperadas = dict(config.seleccionar)
    esperadas.update({letra: filtro.nombreColumna for letra, filtro in config.filtroColumna.items() if filtro.nombreColumna})

    for letra, nombre in esperadas.items():
        posicion = letra_a_numero(letra)
        real = df.iat[fila_encabezado, posicion] if posicion < df.shape[1] else None

        if str(real).strip() != nombre:
            raise ValueError(f"Columna {letra}: se esperaba '{nombre}' y el archivo trae '{real}'.")
