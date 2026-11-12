"""
Resultado por unidad y TOTAL_OOAD con la formula del mapeo, sin importar de donde salieron los
datos. Regla comun de dato incompleto:
  - numerador o denominador faltante (None)        -> Gris, sin resultado
  - denominador 0 con numerador > 0                 -> Gris (inconsistencia: no se puede dividir,
                                                       no es que el desempeño sea malo)
  - numerador 0 con denominador valido (0 o no)     -> cero real, se evalua normal
Usado en: services/{ftp,iaas,extractor,poblacion}/*, services/calculo/mensual_acumulado_Services.py
"""
from schemas.model.unidad_resultado_Model import ResultadoUnidad
from services.calculo.formulas_Services import evaluar_formula

CLAVE_TOTAL = "TOTAL_OOAD"


def es_gris(numerador, denominador) -> bool:
    return numerador is None or denominador is None


##--------------------------------------

def es_inconsistente(numerador, denominador) -> bool:
    """Numerador positivo con denominador 0: no se puede dividir, dato invalido."""
    return (
        numerador is not None and denominador is not None and
        denominador == 0 and numerador > 0
    )


##--------------------------------------

def calcular_resultado(numerador: int | None, denominador: int | None, formula: str) -> int | float | None:
    """Resultado de una unidad segun la formula del mapeo; None si el dato esta incompleto o es inconsistente."""

    if es_gris(numerador, denominador) or es_inconsistente(numerador, denominador):
        return None
    if denominador == 0:
        return 0  # ambos 0: cero real, se evalua normal

    return round(evaluar_formula(formula, numerador, denominador), 2)


##--------------------------------------

def agregar_total_ooad(unidades: dict[str, ResultadoUnidad], formula_resultado: str, numerador_solo_total: int = 0) -> ResultadoUnidad:
    """
    TOTAL_OOAD: suma numerador/denominador de las unidades y evalua la misma formula del
    mapeo (nunca un x100 fijo). Unidad incompleta (Gris) no cuenta; numerador>0 con
    denominador=0 es inconsistencia (no se suma); ambos 0 es un cero real y si cuenta.
    numerador_solo_total: casos sin unidad que igual son del OOAD (DM 05).
    """

    total_num  = numerador_solo_total
    total_den  = 0
    hay_alguna = False

    for nombre, unidad in unidades.items():
        if nombre == CLAVE_TOTAL:
            continue

        num, den = unidad.numerador, unidad.denominador

        if num is None or den is None:
            continue

        if den == 0 and num > 0:
            print(f"[Total OOAD] Inconsistencia en {nombre}: numerador={num} con denominador=0 -- no se incluye en el TOTAL_OOAD.")
            continue

        total_num += num
        total_den += den
        hay_alguna = True

    if not hay_alguna:
        return ResultadoUnidad(numerador=total_num, denominador=None, resultado=None)

    if total_den == 0:
        return ResultadoUnidad(numerador=total_num, denominador=total_den, resultado=0)

    try:
        resultado_total = round(evaluar_formula(formula_resultado, total_num, total_den), 2)
    except Exception as error:
        print(f"[Total OOAD] Error evaluando el resultado: {error}")
        resultado_total = None

    return ResultadoUnidad(numerador=total_num, denominador=total_den, resultado=resultado_total)


##--------------------------------------

def calcular_unidades(
    numerador: dict, denominador: dict, formula: str, unidades: list[str] | None = None,
    excluidas_del_total: list[str] = (), cero_es_sin_dato: bool = False, numerador_solo_total: int = 0,
) -> dict[str, ResultadoUnidad]:
    """
    {unidad: numerador} + {unidad: denominador} ya contados -> {unidad: resultado} + TOTAL_OOAD.
    Es el paso comun de IAAS, Extractor y el recalculo de poblacion de FTP.
      unidades:            cuales y en que orden (por omision las que traigan dato)
      excluidas_del_total: se calculan y muestran, pero no suman al TOTAL_OOAD
      cero_es_sin_dato:    denominador 0 = no tuvo a quien medir (Gris), no "0 = Esperado"
      numerador_solo_total: casos sin unidad que solo suman al TOTAL_OOAD (DM 05)
    """

    if unidades is None:
        unidades = list(dict.fromkeys([*numerador, *denominador]))   # sin repetir, en el orden en que llegaron

    resultados: dict[str, ResultadoUnidad] = {}

    for unidad in unidades:
        if unidad == CLAVE_TOTAL:
            continue

        num, den = numerador.get(unidad), denominador.get(unidad)
        sin_a_quien_medir = cero_es_sin_dato and den == 0
        resultados[unidad] = ResultadoUnidad(
            numerador=num, denominador=den,
            resultado=None if sin_a_quien_medir else calcular_resultado(num, den, formula),
        )

    para_el_total = {unidad: resultado for unidad, resultado in resultados.items() if unidad not in excluidas_del_total}
    resultados[CLAVE_TOTAL] = agregar_total_ooad(para_el_total, formula, numerador_solo_total)

    return resultados
