"""
Regla común de color/estado para indicadores (IAAS y FTP):
  - numerador o denominador faltante (null)              -> Gris (dato incompleto)
  - denominador == 0 con numerador > 0                    -> Gris (inconsistencia:
    no se puede dividir, no es que el desempeño sea malo)
  - numerador == 0 (con denominador válido, sea 0 o no)    -> es un cero real, se
    evalúa normal contra el semáforo, no se fuerza ningún color
Usado en: iaas/services/extraccion_service.py,
          ftp/services/numerador_denominador.py
"""


def es_gris(numerador, denominador) -> bool:
    return numerador is None or denominador is None


def es_inconsistente(numerador, denominador) -> bool:
    """Numerador positivo sin denominador -- no se puede dividir, dato inválido."""
    return (
        numerador is not None and denominador is not None and
        denominador == 0 and numerador > 0
    )


def resolver_color(numerador, denominador, calcular_tasa, evaluar_umbral):
    """
    Para indicadores que calculan tasa y color en un solo paso (IAAS).
    calcular_tasa(numerador, denominador) -> float: solo se llama si el denominador no es cero.
    evaluar_umbral(tasa) -> str: color según el umbral propio del indicador.
    Devuelve (tasa, color).
    """
    if es_gris(numerador, denominador) or es_inconsistente(numerador, denominador):
        return None, "Gris"
    if denominador == 0:
        return 0, evaluar_umbral(0)  # numerador y denominador ambos 0 -- cero real
    tasa = calcular_tasa(numerador, denominador)
    return tasa, evaluar_umbral(tasa)