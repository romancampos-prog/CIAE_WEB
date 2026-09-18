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
_RE_UMBRAL           = re.compile(r'^\s*(<=|>=|<|>|==)\s*(-?\d+(?:\.\d+)?)\s*$')
_RE_UMBRAL_COMPUESTO = re.compile(
    r'^\s*(<=|>=|<|>|==)\s*(-?\d+(?:\.\d+)?)\s*(a|o)\s*(<=|>=|<|>|==)\s*(-?\d+(?:\.\d+)?)\s*$'
)


def es_formato_explicito(metas: dict) -> bool:
    """True si alguno de los valores del semáforo ya trae el operador como texto."""
    return any(isinstance(v, str) for v in metas.values())


def _parsear_umbral(valor):
    """'<= 1.7' -> (operator.le, 1.7). Tira ValueError si el texto no matchea."""
    m = _RE_UMBRAL.match(str(valor))
    if not m:
        raise ValueError(f"Umbral con formato inválido: {valor!r}")
    return _OPERADORES[m.group(1)], float(m.group(2))


def _condicion_de_umbral(valor):
    """
    Devuelve una funcion resultado -> bool que dice si 'resultado' cumple el umbral.
    Soporta el formato simple de _parsear_umbral ("<= 1.7") y ademas los rangos
    compuestos que usa IAAS:
      - "a" = Y logico, rango cerrado:  ">= 4 a <= 7"  -> 4 <= resultado <= 7
      - "o" = O logico, fuera de rango: "< 1 o > 7"    -> resultado < 1 o resultado > 7
    """
    texto = str(valor)

    m = _RE_UMBRAL_COMPUESTO.match(texto)
    if m:
        op1_txt, val1_txt, conector, op2_txt, val2_txt = m.groups()
        op1, val1 = _OPERADORES[op1_txt], float(val1_txt)
        op2, val2 = _OPERADORES[op2_txt], float(val2_txt)
        if conector == "a":
            return lambda r: op1(r, val1) and op2(r, val2)
        return lambda r: op1(r, val1) or op2(r, val2)  # "o"

    op, val = _parsear_umbral(texto)
    return lambda r: op(r, val)


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


def es_agrupado(semaforo: dict) -> bool:
    """
    True si el semaforo esta partido por grupo (ej. tipo de hospital en IAAS 01:
    {"HGS": {...}, "HGZ": {...}, "OOAD": {...}}) y no por mes ni con metas directas.
    No importa que significa cada grupo -- solo que sus valores son bloques de
    metas y sus llaves no son meses.
    """
    from shared.MESES import MESES_ESTANDAR

    return bool(semaforo) and all(isinstance(v, dict) for v in semaforo.values()) \
        and not any(k in MESES_ESTANDAR for k in semaforo)


def umbrales_para(semaforo: dict, mes: str | None = None, grupo: str | None = None) -> dict:
    """
    Elige el bloque de metas que aplica dentro del semaforo de un indicador,
    segun su forma (las 3 que existen en indicadores/mapeo/):
      - mensual  ({"Enero": metas, ...}): el del mes ("Enero".."Diciembre")
      - agrupado ({"HGS": metas, ..., "OOAD": metas}): el del grupo; si el
                 grupo no existe (ej. el total) se usa "OOAD"
      - fijo     (metas directas): el mismo para todos
    Un solo lugar para esta decision -- la usan FTP, IAAS y Extractor.
    """
    if mes and mes in semaforo:
        return semaforo[mes]
    if grupo is not None and es_agrupado(semaforo):
        return semaforo.get(grupo, semaforo.get("OOAD"))
    return semaforo


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
        if _condicion_de_umbral(metas["Esperado"])(resultado):
            return "Esperado"

    for clave in ("Bajo", "Alto"):
        if clave in metas:
            if _condicion_de_umbral(metas[clave])(resultado):
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
