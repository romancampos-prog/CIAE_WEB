"""
Evaluar las formulas del mapeo (ej. "CP02[0] + CP03[1]", "numerador / denominador * 100") con
lo que solo pueden usar (sum, round, abs, math), y el redondeo propio de los indicadores.
Usado en: services/*
"""
import math
import re

from schemas.model.unidad_resultado_Model import ValoresPorFuente

UMBRAL_SUBE_REDONDEO = 0.60

# Lo unico que puede usar una formula del mapeo.
_CONTEXTO_BASE_EVAL = {'sum': sum, 'round': round, 'abs': abs, 'math': math}

_NOMBRES_RESERVADOS = {'sum', 'round', 'abs', 'math', 'numerador', 'denominador', 'None', 'True', 'False'}


def redondeo_personalizado(valor: float | None, umbral_sube: float = UMBRAL_SUBE_REDONDEO) -> int | None:
    """Redondea al entero de arriba solo si la parte decimal llega al umbral (no al .5 de siempre)."""

    if valor is None:
        return None

    parte_decimal, parte_entera = math.modf(valor)

    if abs(parte_decimal) >= umbral_sube:
        return int(parte_entera + (1 if valor >= 0 else -1))

    return int(parte_entera)


##--------------------------------------

def _nombres_usados(expresion: str) -> set[str]:
    return {t for t in re.findall(r'[A-Za-z_][A-Za-z0-9_]*', expresion) if t not in _NOMBRES_RESERVADOS}


##--------------------------------------

def evaluar_lado(expresion: str, datos_lado: ValoresPorFuente, umbral_sube: float = UMBRAL_SUBE_REDONDEO) -> int | None:
    """Evalua la expresion de un lado (ej. "CP02[0] + CP03[1]"); None si ninguno de los nombres que usa trae dato."""
    usados = _nombres_usados(expresion) & datos_lado.keys()

    if not usados or all(datos_lado[nombre] is None for nombre in usados):
        return None

    contexto = _CONTEXTO_BASE_EVAL.copy()

    for nombre, valores in datos_lado.items():
        contexto[nombre] = [v if v is not None else 0 for v in valores] if valores is not None else [0] * 20

    return redondeo_personalizado(eval(expresion, {"__builtins__": None}, contexto), umbral_sube)


##--------------------------------------

def evaluar_formula(formula: str, numerador: float, denominador: float) -> float:
    """La formula de resultado del mapeo (ej. "numerador / denominador * 100"), sin redondear."""
    return eval(formula, {"__builtins__": None}, {**_CONTEXTO_BASE_EVAL, "numerador": numerador, "denominador": denominador})
