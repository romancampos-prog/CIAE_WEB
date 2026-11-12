"""
Si el texto de una celda es la unidad buscada, comparando por su numero ("HGZ 2 X" -> 2).
Usado en: indicadores/services/iaas/numerador_denominador_iaas_Services.py, modos_por_filtro/filtro_unidad_valor_Services.py
"""
import re


def coincide_unidad(valor, nombre_unidad: str) -> bool:
    """
    Busca la unidad por su NUMERO (segundo token del nombre, ej. "HGZ 2 X" -> 2)
    como palabra completa -- el Excel a veces trae otra variante del nombre de
    la ciudad.
    """
    partes = nombre_unidad.split()
    return len(partes) > 1 and re.search(rf'\b{re.escape(partes[1])}\b', str(valor)) is not None
