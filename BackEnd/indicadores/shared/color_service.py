"""
Regla común de color/estado para indicadores (IAAS y FTP): numerador o
denominador faltante -> Gris (dato incompleto); alguno en 0 con el otro
presente -> Bajo forzado (dato sospechoso, no se evalúa contra el umbral).
Usado en: iaas/services/extraccion_service.py,
          ftp/services/numerador_denominador.py
"""


def es_gris(numerador, denominador) -> bool:
    return numerador is None or denominador is None


def es_bajo_forzado(numerador, denominador) -> bool:
    return (
        numerador is not None and denominador is not None and
        (numerador == 0 or denominador == 0)
    )


def resolver_color(numerador, denominador, calcular_tasa, evaluar_umbral):
    """
    Para indicadores que calculan tasa y color en un solo paso (IAAS).
    calcular_tasa(numerador, denominador) -> float: solo se llama si ambos son válidos y no-cero.
    evaluar_umbral(tasa) -> str: color según el umbral propio del indicador.
    Devuelve (tasa, color).
    """
    if es_gris(numerador, denominador):
        return None, "Gris"
    if es_bajo_forzado(numerador, denominador):
        return 0, "Bajo"
    tasa = calcular_tasa(numerador, denominador)
    return tasa, evaluar_umbral(tasa)