"""
Evalúa el color (Esperado/Medio/Bajo) de un resultado contra los umbrales
del semáforo de un indicador.

Soporta dos formatos en el mismo diccionario de metas, para poder migrar
indicador por indicador sin romper a los que todavía no se tocaron:

  - Legado (número puro): {"Bajo": 1.7, "Esperado": 2.3}
                            o {"Alto": 60, "Esperado": 30}
    El sentido de la comparación se deduce de qué clave está presente
    ("Bajo" = más es mejor, "Alto" = menos es mejor).

  - Explícito (string con operador): {"Bajo": "<= 1.7", "Esperado": ">= 2.3"}
    El sentido de la comparación viene escrito en el propio valor, no hay
    que adivinarlo por el nombre de la clave.

Usado en: ftp/services/semaforizado.py, ftp/services/generar_excel.py
"""
import re
import operator

_OPERADORES = {
    "<=": operator.le,
    ">=": operator.ge,
    "<":  operator.lt,
    ">":  operator.gt,
    "==": operator.eq,
}
_RE_UMBRAL = re.compile(r'^\s*(<=|>=|<|>|==)\s*(-?\d+(?:\.\d+)?)\s*$')


def es_formato_explicito(metas: dict) -> bool:
    """True si alguno de los valores del semáforo ya trae el operador como texto."""
    return any(isinstance(v, str) for v in metas.values())


def _parsear_umbral(valor):
    """'<= 1.7' -> (operator.le, 1.7). Tira ValueError si el texto no matchea."""
    m = _RE_UMBRAL.match(str(valor))
    if not m:
        raise ValueError(f"Umbral con formato inválido: {valor!r}")
    return _OPERADORES[m.group(1)], float(m.group(2))


def numero_de_umbral(valor):
    """
    Saca el número de un umbral sin importar el formato: 1.7 -> 1.7, "<= 1.7" -> 1.7.
    Para armar textos (leyendas, ejes) sin duplicar el operador cuando ya viene
    en formato explícito. Devuelve None si no se pudo interpretar.
    """
    if isinstance(valor, (int, float)):
        return valor
    m = re.search(r'-?\d+(?:\.\d+)?', str(valor))
    return float(m.group(0)) if m else None


def evaluar_color(resultado: float, metas: dict) -> str:
    """
    Devuelve "Esperado" / "Medio" / "Bajo" según el resultado y las metas.
    metas puede venir en formato legado o explícito -- se detecta solo.
    """
    if es_formato_explicito(metas):
        return _evaluar_explicito(resultado, metas)
    return _evaluar_legado(resultado, metas)


def _evaluar_explicito(resultado: float, metas: dict) -> str:
    if "Esperado" in metas:
        op, val = _parsear_umbral(metas["Esperado"])
        if op(resultado, val):
            return "Esperado"

    for clave in ("Bajo", "Alto"):
        if clave in metas:
            op, val = _parsear_umbral(metas[clave])
            if op(resultado, val):
                return "Bajo"

    return "Medio"


def _evaluar_legado(resultado: float, metas: dict) -> str:
    """Misma lógica que ya usaban Semaforizado()/_calcular_color() -- sin cambios."""
    if "Bajo" in metas and "Esperado" in metas:
        if resultado >= metas["Esperado"]:
            return "Esperado"
        elif resultado <= metas["Bajo"]:
            return "Bajo"
        return "Medio"
    elif "Alto" in metas and "Esperado" in metas:
        if resultado <= metas["Esperado"]:
            return "Esperado"
        elif resultado >= metas["Alto"]:
            return "Bajo"
        return "Medio"
    return "Gris"
