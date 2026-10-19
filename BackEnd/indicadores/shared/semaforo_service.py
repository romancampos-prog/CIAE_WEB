"""
Semaforo de los indicadores: color (Esperado/Medio/Bajo/Gris) de un resultado contra los
umbrales del mapeo, y semaforizado de las unidades de un reporte. Un solo lugar para esta
regla: la usan FTP, IAAS, Extractor, las graficas y el Excel.

Soporta dos formatos en el mismo diccionario de metas, para poder migrar indicador por
indicador sin romper a los que todavia no se tocaron:
  - Legado (numero puro): {"Bajo": 1.7, "Esperado": 2.3} o {"Alto": 60, "Esperado": 30}.
    El sentido se deduce de la clave presente ("Bajo" = mas es mejor, "Alto" = menos es mejor).
  - Explicito (texto con operador): {"Bajo": "<= 1.7", "Esperado": ">= 2.3"}.
Y tres formas de semaforo: mensual ({"Enero": metas, ...}), agrupado por tipo de hospital
(IAAS 01: {"HGS": metas, ..., "OOAD": metas}) o fijo (metas directas).
Usado en: services/* (generacion, calculo, graficas y Excel)
"""
import operator
import re

from schemas.model.generacion_Model import ResultadoUnidad, UnidadSemaforizada
from schemas.model.indicador_Model import UnidadDatos
from shared.MESES import MESES_ESTANDAR
from shared.UNIDADES import grupo_de_unidad_iaas01

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


##--------------------------------------

def _parsear_umbral(valor):
    """'<= 1.7' -> (operator.le, 1.7). Tira ValueError si el texto no matchea."""
    m = _RE_UMBRAL.match(str(valor))
    if not m:
        raise ValueError(f"Umbral con formato inválido: {valor!r}")
    return _OPERADORES[m.group(1)], float(m.group(2))


##--------------------------------------

def _condicion_de_umbral(valor):
    """
    Funcion resultado -> bool que dice si 'resultado' cumple el umbral. Ademas del formato
    simple ("<= 1.7") acepta los rangos compuestos de IAAS:
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


##--------------------------------------

def evaluar_color(resultado: float, metas: dict) -> str:
    """"Esperado" / "Medio" / "Bajo" segun el resultado y las metas (formato legado o explicito)."""
    if es_formato_explicito(metas):
        return _evaluar_explicito(resultado, metas)
    return _evaluar_legado(resultado, metas)


##--------------------------------------

def _evaluar_explicito(resultado: float, metas: dict) -> str:
    if "Esperado" in metas:
        if _condicion_de_umbral(metas["Esperado"])(resultado):
            return "Esperado"

    for clave in ("Bajo", "Alto"):
        if clave in metas:
            if _condicion_de_umbral(metas[clave])(resultado):
                return "Bajo"

    return "Medio"


##--------------------------------------

def _evaluar_legado(resultado: float, metas: dict) -> str:
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


##--------------------------------------

def color_de_resultado(resultado: float | None, semaforo: dict, mes: str | None = None, unidad: str | None = None) -> str:
    """
    Color de una unidad: Gris si no tiene resultado; si no, el de los umbrales de ese mes
    ("Enero".."Diciembre") o del grupo de la unidad (solo IAAS 01 tiene semaforo agrupado).
    """
    if resultado is None:
        return "Gris"
    return evaluar_color(resultado, umbrales_para(semaforo, mes, grupo_de_unidad_iaas01(unidad)))


##--------------------------------------

def semaforizar_unidades(
    unidades: dict[str, ResultadoUnidad], semaforo: dict, mes: str | int | None = None,
) -> dict[str, UnidadSemaforizada]:
    """{unidad: ResultadoUnidad} -> {unidad: UnidadSemaforizada}; mes como numero (1-12 o "01"-"12")."""
    nombre_mes = MESES_ESTANDAR[int(mes) - 1] if mes else None
    return {
        nombre: UnidadSemaforizada(**unidad.model_dump(), color=color_de_resultado(unidad.resultado, semaforo, nombre_mes, nombre))
        for nombre, unidad in unidades.items()
    }


##--------------------------------------

def semaforizar_reporte(
    datos: dict[str, dict[str, UnidadDatos]] | dict[str, UnidadDatos], semaforo: dict | None, mes: str | None = None,
) -> dict[str, dict[str, UnidadDatos]] | dict[str, UnidadDatos]:
    """
    Pone el 'desempeno' de cada UnidadDatos (formato guardado en BD_CIAE). Sirve para varios
    meses ({mes: {unidad: UnidadDatos}}, ej. el mensual acumulado) o para uno solo
    ({unidad: UnidadDatos}, con 'mes' aparte como "Enero".."Diciembre"). Las unidades sin
    resultado se dejan como vienen: no se semaforiza lo que no se pudo calcular.
    """
    if not semaforo:
        return datos
    if isinstance(next(iter(datos.values()), None), dict):
        return {m: semaforizar_reporte(unidades, semaforo, m) for m, unidades in datos.items()}

    for unidad, dato in datos.items():
        if dato.resultado is not None:
            dato.desempeno = color_de_resultado(dato.resultado, semaforo, mes, unidad)
    return datos
