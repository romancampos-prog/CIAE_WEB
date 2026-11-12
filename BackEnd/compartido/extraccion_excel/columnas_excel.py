"""
Letra de columna de Excel ("A", "AA") a su posicion: la usan el motor de extraccion, el lector
de los Excel que sube el usuario, IAAS y el Extractor (todas las columnas del mapeo van por letra).
Usado en: los modos de extraccion y, en indicadores, LectorExcel, IAAS y el Extractor
"""


def letra_a_numero(letra: str) -> int:
    """Letra de columna de Excel a indice 0-based ("A" -> 0, "AA" -> 26)."""
    numero = 0

    for c in letra.upper():
        numero = numero * 26 + (ord(c) - ord('A') + 1)

    return numero - 1
