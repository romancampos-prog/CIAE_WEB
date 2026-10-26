"""
Leer el valor de una celda de Excel: a numero (aceptando comas de miles) y si esta vacia.
Usado en: services/compartido/extraccion/modos_por_*_Services.py
"""
import pandas as pd


def a_numero(valor):
    """Convierte una celda a float, aceptando comas de miles; None si no se puede."""

    if pd.api.types.is_number(valor) and not pd.isna(valor):
        return float(valor)

    texto = str(valor).replace(',', '').strip()

    try:
        return float(texto) if texto else 0.0
    except ValueError:
        return None


##--------------------------------------

def es_vacio(valor) -> bool:
    return valor is None or (not isinstance(valor, str) and pd.isna(valor))
