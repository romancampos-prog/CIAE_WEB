"""
ULTIMA_FILA: desde la fila encabezado hacia abajo, el ultimo valor numerico de cada columna.
Usado en: motor_extraccion_Services.py
"""
import pandas as pd

from service.extraccion_excel.columnas_excel import letra_a_numero
from service.extraccion_excel.detalle_extraccion_Model import DetalleUltimaFila


def ultima_fila(df, detalle: DetalleUltimaFila):
    indices = [letra_a_numero(l) for l in detalle.columna_dato]
    bloque  = df.iloc[detalle.encabezado:, indices]

    valores = []

    for i in range(bloque.shape[1]):
        columna = pd.to_numeric(bloque.iloc[:, i], errors='coerce').dropna()
        valores.append(float(columna.iloc[-1]) if not columna.empty else None)

    if all(v is None for v in valores):
        return None, "ARCHIVO_VACIO", f"Sin valores numericos en {detalle.columna_dato} desde fila {detalle.encabezado + 1}"
    if any(v is None for v in valores):
        return valores, "VALOR_NULO", None

    return valores, None, None
