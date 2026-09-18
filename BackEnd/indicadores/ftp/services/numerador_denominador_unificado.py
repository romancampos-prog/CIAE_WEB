"""
Evalua numerador/denominador/resultado de un indicador FTP a partir de lo que
regresa ftp_extraer_unificado.ExtraerInformacionPreviaUnificada, donde cada
lado (numerador/denominador) trae su propio espacio de nombres -- por eso un
repo como PU01 puede valer cosas distintas en cada lado sin chocar.

Misma salida que numerador_denominador.ObtenerNumDen ({unidad: {numerador,
denominador, resultado}} + TOTAL_OOAD) para que Semaforizado y el resto del
pipeline no noten la diferencia. Redondeo, reglas de Gris/inconsistencia y
TOTAL_OOAD se reusan de numerador_denominador.py.
Usado en: (pendiente de conectar) ftp/services/reporte_final.py, reporte_categoria.py
"""
import re
from pydantic import BaseModel

from ftp.services.numerador_denominador import (
    CONTEXTO_BASE_EVAL, redondeo_personalizado, AgregarTotalOOAD,
)
from schemas.model.ficha_tecnica_Model import Operacion
from shared.color_service import es_gris, es_inconsistente

_NOMBRES_RESERVADOS = {'sum', 'round', 'abs', 'math', 'numerador', 'denominador', 'None', 'True', 'False'}


class ResultadoUnidad(BaseModel):
    numerador:   int | None = None
    denominador: int | None = None
    resultado:   int | float | None = None


def _nombres_usados(expresion: str) -> set[str]:
    return {t for t in re.findall(r'[A-Za-z_][A-Za-z0-9_]*', expresion) if t not in _NOMBRES_RESERVADOS}


def evaluar_lado(expresion: str, datos_lado: dict, umbral_sube: float):
    """Evalua una expresion de un lado; None si ninguno de los nombres que usa trae dato."""
    usados = _nombres_usados(expresion) & datos_lado.keys()
    if not usados or all(datos_lado[nombre] is None for nombre in usados):
        return None

    contexto = CONTEXTO_BASE_EVAL.copy()
    for nombre, valores in datos_lado.items():
        contexto[nombre] = [v if v is not None else 0 for v in valores] if valores is not None else [0] * 20
    return redondeo_personalizado(eval(expresion, {"__builtins__": None}, contexto), umbral_sube)


def calcular_resultado(numerador, denominador, formula: str):
    """Resultado de una unidad segun la formula del mapeo; None si el dato esta incompleto o es inconsistente."""
    if es_gris(numerador, denominador) or es_inconsistente(numerador, denominador):
        return None
    if denominador == 0:
        return 0  # ambos 0: cero real, se evalua normal
    return round(eval(formula, {"__builtins__": None}, {**CONTEXTO_BASE_EVAL, "numerador": numerador, "denominador": denominador}), 2)


def ObtenerNumDenUnificado(previo: dict, operacion: Operacion, umbral_sube: float = 0.60):
    resultados:      dict = {}
    errores_calculo: dict = {}

    for unidad, lados in previo.items():
        try:
            numerador   = evaluar_lado(operacion.numerador,   lados["numerador"],   umbral_sube)
            denominador = evaluar_lado(operacion.denominador, lados["denominador"], umbral_sube)

            resultado = calcular_resultado(numerador, denominador, operacion.resultado)

            resultados[unidad] = ResultadoUnidad(
                numerador=numerador, denominador=denominador,
                resultado=resultado,
            ).model_dump()
        except Exception as e:
            print(f"Error calculando indicadores para {unidad}: {e}")
            resultados[unidad] = ResultadoUnidad().model_dump()
            errores_calculo[unidad] = str(e)

    AgregarTotalOOAD(resultados, operacion.resultado)
    return resultados, errores_calculo
