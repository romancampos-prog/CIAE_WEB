"""
INTERSECCION_FILA: los valores de columna_dato en filas fijas (numeradas como en Excel).
Usado en: motor_extraccion_Services.py
"""
from compartido.extraccion_excel.columnas_excel import letra_a_numero
from compartido.extraccion_excel.detalle_extraccion_Model import DetalleInterseccionFila
from compartido.extraccion_excel.valores_celda_Services import a_numero


def interseccion_fila(df, detalle: DetalleInterseccionFila):
    valores = []

    for f in detalle.fila:
        idx_fila = f - 1

        for letra in detalle.columna_dato:
            idx_col = letra_a_numero(letra)

            try:
                valores.append(a_numero(df.iloc[idx_fila, idx_col]) or 0.0)
            except IndexError:
                valores.append(None)

    if not valores or all(v is None for v in valores):
        return None, "ARCHIVO_VACIO", f"Filas {detalle.fila} vacias o no encontradas"
    if any(v is None for v in valores):
        return valores, "VALOR_NULO", None

    return valores, None, None
