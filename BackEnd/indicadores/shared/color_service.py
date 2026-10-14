"""
Regla común de color/estado para indicadores (IAAS y FTP):
  - numerador o denominador faltante (null)              -> Gris (dato incompleto)
  - denominador == 0 con numerador > 0                    -> Gris (inconsistencia:
    no se puede dividir, no es que el desempeño sea malo)
  - numerador == 0 (con denominador válido, sea 0 o no)    -> es un cero real, se
    evalúa normal contra el semáforo, no se fuerza ningún color
Usado en: iaas/services/extraccion_service.py,
          services/calculo_indicador_Services.py
"""


def es_gris(numerador, denominador) -> bool:
    return numerador is None or denominador is None


def es_inconsistente(numerador, denominador) -> bool:
    """Numerador positivo sin denominador -- no se puede dividir, dato inválido."""
    return (
        numerador is not None and denominador is not None and
        denominador == 0 and numerador > 0
    )