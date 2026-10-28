"""
Calculo de un indicador de FTP: lo leido de los reportes por unidad (por fuente y columna) ->
numerador y denominador con las formulas del mapeo, resultado y TOTAL_OOAD.
Usado en: services/ftp/generar_indicador_ftp_Services.py
"""
from schemas.model.ficha_indicador_Model import Operacion
from schemas.model.unidad_resultado_Model import DatosExtraidosUnidad, ResultadoUnidad
from services.calculo.formulas_Services import UMBRAL_SUBE_REDONDEO, evaluar_lado
from services.calculo.resultado_unidades_Services import CLAVE_TOTAL, agregar_total_ooad, calcular_resultado


def calcular_indicador(
    extraidos: dict[str, DatosExtraidosUnidad], operacion: Operacion,
    umbral_sube: float = UMBRAL_SUBE_REDONDEO,
) -> tuple[dict[str, ResultadoUnidad], dict[str, str]]:
    """
    FTP: lo leido de los reportes por unidad -> (resultado por unidad + TOTAL_OOAD,
    {unidad: mensaje} de las formulas que fallaron).
    """
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
