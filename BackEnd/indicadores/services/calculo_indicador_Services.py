"""
Calculo de un indicador a partir de lo ya extraido: evalua las formulas del mapeo
(numerador, denominador, resultado), agrega el TOTAL_OOAD y asigna el semaforo.
No sabe de donde salieron los datos (FTP, poblacion, archivos subidos).
Usado en: services/ftp/generacion_indicador_ftp_Services.py, services/iaas/*, ftp/services/recalcular_poblacion_service.py
"""
import math
import re
from typing import Callable

from schemas.model.ficha_tecnica_Model import Operacion
from schemas.model.generacion_ftp_Model import (
    DatosExtraidosUnidad, ResultadoUnidad, UnidadSemaforizada, ValoresPorFuente,
)
from shared.MESES import MESES_ESTANDAR
from shared.color_service import es_gris, es_inconsistente
from shared.semaforo_service import evaluar_color, umbrales_para

UMBRAL_SUBE_REDONDEO = 0.60
CLAVE_TOTAL = "TOTAL_OOAD"

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


def _nombres_usados(expresion: str) -> set[str]:
    return {t for t in re.findall(r'[A-Za-z_][A-Za-z0-9_]*', expresion) if t not in _NOMBRES_RESERVADOS}


def evaluar_lado(expresion: str, datos_lado: ValoresPorFuente, umbral_sube: float = UMBRAL_SUBE_REDONDEO) -> int | None:
    """Evalua la expresion de un lado; None si ninguno de los nombres que usa trae dato."""
    usados = _nombres_usados(expresion) & datos_lado.keys()
    if not usados or all(datos_lado[nombre] is None for nombre in usados):
        return None

    contexto = _CONTEXTO_BASE_EVAL.copy()
    for nombre, valores in datos_lado.items():
        contexto[nombre] = [v if v is not None else 0 for v in valores] if valores is not None else [0] * 20
    return redondeo_personalizado(eval(expresion, {"__builtins__": None}, contexto), umbral_sube)


def calcular_resultado(numerador: int | None, denominador: int | None, formula: str) -> int | float | None:
    """Resultado de una unidad segun la formula del mapeo; None si el dato esta incompleto o es inconsistente."""
    if es_gris(numerador, denominador) or es_inconsistente(numerador, denominador):
        return None
    if denominador == 0:
        return 0  # ambos 0: cero real, se evalua normal
    return round(eval(formula, {"__builtins__": None}, {**_CONTEXTO_BASE_EVAL, "numerador": numerador, "denominador": denominador}), 2)


def agregar_total_ooad(unidades: dict[str, ResultadoUnidad], formula_resultado: str) -> ResultadoUnidad:
    """
    TOTAL_OOAD: suma numerador/denominador de las unidades y evalua la misma formula
    del mapeo (nunca un x100 fijo, no todos los indicadores multiplican por 100).
    Reglas: unidad incompleta (Gris) no cuenta; numerador>0 con denominador=0 es
    inconsistencia (no se suma); ambos 0 es un cero real y si cuenta.
    """
    total_num  = 0
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
        resultado_total = round(eval(formula_resultado, {"__builtins__": None}, {**_CONTEXTO_BASE_EVAL, "numerador": total_num, "denominador": total_den}), 2)
    except Exception as error:
        print(f"[Total OOAD] Error evaluando el resultado: {error}")
        resultado_total = None
    return ResultadoUnidad(numerador=total_num, denominador=total_den, resultado=resultado_total)


def calcular_indicador(
    extraidos: dict[str, DatosExtraidosUnidad], operacion: Operacion,
    umbral_sube: float = UMBRAL_SUBE_REDONDEO,
) -> tuple[dict[str, ResultadoUnidad], dict[str, str]]:
    """Regresa (resultado por unidad + TOTAL_OOAD, {unidad: mensaje} de las formulas que fallaron)."""
    resultados:      dict[str, ResultadoUnidad] = {}
    errores_calculo: dict[str, str] = {}

    for unidad, datos in extraidos.items():
        try:
            numerador   = evaluar_lado(operacion.numerador,   datos.numerador,   umbral_sube)
            denominador = evaluar_lado(operacion.denominador, datos.denominador, umbral_sube)
            resultados[unidad] = ResultadoUnidad(
                numerador=numerador, denominador=denominador,
                resultado=calcular_resultado(numerador, denominador, operacion.resultado),
            )
        except Exception as error:
            print(f"Error calculando indicadores para {unidad}: {error}")
            resultados[unidad] = ResultadoUnidad()
            errores_calculo[unidad] = str(error)

    resultados[CLAVE_TOTAL] = agregar_total_ooad(resultados, operacion.resultado)
    return resultados, errores_calculo


def semaforizar_unidades(
    unidades: dict[str, ResultadoUnidad], semaforo: dict,
    mes: str | int | None = None, grupo_de_unidad: Callable[[str], str | None] | None = None,
) -> dict[str, UnidadSemaforizada]:
    """
    Asigna Esperado/Medio/Bajo; Gris si la unidad no tiene resultado. Los umbrales
    del semaforo pueden variar por mes (FTP/Extractor, mismo umbral para todas las
    unidades ese mes) o por grupo (IAAS 01, cada unidad segun su tipo de hospital,
    via grupo_de_unidad) -- umbrales_para ya resuelve las dos formas.
    """
    nombre_mes = MESES_ESTANDAR[int(mes) - 1] if mes else None

    return {
        nombre: UnidadSemaforizada(
            **unidad.model_dump(),
            color="Gris" if unidad.resultado is None else evaluar_color(
                unidad.resultado,
                umbrales_para(semaforo, nombre_mes, grupo_de_unidad(nombre) if grupo_de_unidad else None),
            ),
        )
        for nombre, unidad in unidades.items()
    }
