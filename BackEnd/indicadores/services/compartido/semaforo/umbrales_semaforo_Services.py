"""
Leer los umbrales del semaforo del mapeo. Soporta dos formatos en el mismo diccionario de
metas, para poder migrar indicador por indicador sin romper a los que todavia no se tocaron:
  - Legado (numero puro): {"Bajo": 1.7, "Esperado": 2.3} o {"Alto": 60, "Esperado": 30}.
    El sentido se deduce de la clave presente ("Bajo" = mas es mejor, "Alto" = menos es mejor).
  - Explicito (texto con operador): {"Bajo": "<= 1.7", "Esperado": ">= 2.3"}.
Y tres formas de semaforo: mensual ({"Enero": metas, ...}), agrupado por tipo de hospital
(IAAS 01: {"HGS": metas, ..., "OOAD": metas}) o fijo (metas directas).
Usado en: services/compartido/semaforo/color_semaforo_Services.py, services/grafica/*, services/excel/*, services/informacion/*
"""
import operator
import re

from shared.MESES import MESES_ESTANDAR

_OPERADORES = {
    "<=": operator.le,
    ">=": operator.ge,
    "<":  operator.lt,
    ">":  operator.gt,
    "==": operator.eq,
}

RE_UMBRAL           = re.compile(r'^\s*(<=|>=|<|>|==)\s*(-?\d+(?:\.\d+)?)\s*$')

RE_UMBRAL_COMPUESTO = re.compile(
    r'^\s*(<=|>=|<|>|==)\s*(-?\d+(?:\.\d+)?)\s*(a|o)\s*(<=|>=|<|>|==)\s*(-?\d+(?:\.\d+)?)\s*$'
)


def es_formato_explicito(metas: dict) -> bool:
    """True si alguno de los valores del semáforo ya trae el operador como texto."""
    return any(isinstance(v, str) for v in metas.values())


##--------------------------------------

def _parsear_umbral(valor):
    """'<= 1.7' -> (operator.le, 1.7). Tira ValueError si el texto no matchea."""
    m = RE_UMBRAL.match(str(valor))

    if not m:
        raise ValueError(f"Umbral con formato inválido: {valor!r}")

    return _OPERADORES[m.group(1)], float(m.group(2))


##--------------------------------------

def condicion_de_umbral(valor):
    """
    Funcion resultado -> bool que dice si 'resultado' cumple el umbral. Ademas del formato
    simple ("<= 1.7") acepta los rangos compuestos de IAAS:
      - "a" = Y logico, rango cerrado:  ">= 4 a <= 7"  -> 4 <= resultado <= 7
      - "o" = O logico, fuera de rango: "< 1 o > 7"    -> resultado < 1 o resultado > 7
    """
    texto = str(valor)

    m = RE_UMBRAL_COMPUESTO.match(texto)

    if m:
        op1_txt, val1_txt, conector, op2_txt, val2_txt = m.groups()
        op1, val1 = _OPERADORES[op1_txt], float(val1_txt)
        op2, val2 = _OPERADORES[op2_txt], float(val2_txt)

        if conector == "a":
            return lambda r: op1(r, val1) and op2(r, val2)

        return lambda r: op1(r, val1) or op2(r, val2)  # "o"

    op, val = _parsear_umbral(texto)
    return lambda r: op(r, val)


##--------------------------------------

def numero_de_umbral(valor):
    """
    El numero de un umbral sin importar el formato: 1.7 -> 1.7, "<= 1.7" -> 1.7. Para armar
    textos (leyendas, ejes) sin duplicar el operador. None si no se pudo interpretar.
    """

    if isinstance(valor, (int, float)):
        return valor

    m = re.search(r'-?\d+(?:\.\d+)?', str(valor))
    return float(m.group(0)) if m else None


##--------------------------------------

def es_agrupado(semaforo: dict) -> bool:
    """
    True si el semaforo esta partido por grupo (ej. tipo de hospital en IAAS 01:
    {"HGS": {...}, "HGZ": {...}, "OOAD": {...}}) y no por mes ni con metas directas.
    """
    return bool(semaforo) and all(isinstance(v, dict) for v in semaforo.values()) \
        and not any(k in MESES_ESTANDAR for k in semaforo)


##--------------------------------------

def umbrales_para(semaforo: dict, mes: str | None = None, grupo: str | None = None) -> dict:
    """
    El bloque de metas que aplica dentro del semaforo de un indicador:
      - mensual  ({"Enero": metas, ...}): el del mes ("Enero".."Diciembre")
      - agrupado ({"HGS": metas, ..., "OOAD": metas}): el del grupo; si el grupo no
                 existe (ej. el total) se usa "OOAD"
      - fijo     (metas directas): el mismo para todos
    """

    if mes and mes in semaforo:
        return semaforo[mes]
    if grupo is not None and es_agrupado(semaforo):
        return semaforo.get(grupo, semaforo.get("OOAD"))

    return semaforo
