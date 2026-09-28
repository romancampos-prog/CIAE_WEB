"""
Calculo de un indicador IAAS a partir del numerador/denominador ya extraidos de los
Excel (exclusivo de IAAS: junta las unidades esperadas y arma el resultado + color
por unidad). La formula y el total OOAD son los mismos de FTP -- reutilizados tal
cual, sin cambios: el mapeo de IAAS ya trae operacion.resultado como una formula
directa sobre numerador/denominador (nunca combina varios reportes, asi que no
hace falta evaluar_lado, solo calcular_resultado).
Usado en: services/iaas/generacion_iaas_Services.py
"""
from schemas.model.generacion_ftp_Model import ResultadoUnidad, UnidadSemaforizada
from services.calculo_indicador_Services import CLAVE_TOTAL, agregar_total_ooad, calcular_resultado, semaforizar_unidades
from services.indicadorMapeo_Services import cargar_indicador_iaas
from shared.UNIDADES import ORDEN_DEMAS_IAAS, ORDEN_IAAS01, grupo_de_unidad_iaas01


def _unidades_esperadas(indicador: str) -> list[str]:
    return ORDEN_IAAS01 if indicador == "IAAS 01" else ORDEN_DEMAS_IAAS


def calcular_indicador_iaas(
    indicador: str, numerador: dict[str, int], denominador: dict[str, int],
) -> dict[str, UnidadSemaforizada]:
    """
    {unidad: numerador ya extraido} + {unidad: denominador ya extraido/capturado} ->
    {unidad: resultado + color, con TOTAL_OOAD}. Toda unidad esperada se incluye
    aunque le falte numerador o denominador ese mes (queda incompleto -- Gris --
    no un 0 real que nunca se reporto).
    """
    mapeo   = cargar_indicador_iaas(indicador)
    formula = mapeo.reporte.operacion.resultado

    resultados: dict[str, ResultadoUnidad] = {}
    for unidad in set(_unidades_esperadas(indicador)) | set(numerador) | set(denominador):
        if unidad == CLAVE_TOTAL:
            continue  # viene incluido en numerador/denominador (suma de obtener_numerador) -- se recalcula abajo con las 3 reglas
        num = numerador.get(unidad)
        den = denominador.get(unidad)
        resultados[unidad] = ResultadoUnidad(numerador=num, denominador=den, resultado=calcular_resultado(num, den, formula))

    resultados[CLAVE_TOTAL] = agregar_total_ooad(resultados, formula)

    return semaforizar_unidades(resultados, mapeo.semaforo, grupo_de_unidad=grupo_de_unidad_iaas01)
