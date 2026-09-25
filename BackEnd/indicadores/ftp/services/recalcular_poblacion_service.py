"""
Recalcula el denominador de los indicadores cuyo denominador sale de la
poblacion InfoSalud (fuente "poblacionInfoSalud" en el mapeo unificado),
usando el numerador ya guardado en el JSON historico y el POBLACION_{anio}.json
actualizado. NO accede al FTP. Guarda de vuelta numerador, denominador,
resultado, color y TOTAL_OOAD de cada mes ya cerrado, con las mismas reglas que
la generacion normal.
Usado en: ftp/controllers/reportes_controller.py  (/recalcular-poblacion)
"""
from shared.unidades_ftp import NOMBREUNIDADESARCHIVO
from schemas.model.generacion_ftp_Model import DatosExtraidosUnidad, ResultadoUnidad
from schemas.model.reporte_mapeo_Model import FuentePoblacionInfoSalud
from services.bd_Ciae_Guardado_Services import guardar_mes_definitivo, leer_numeradores_todos_meses
from services.calculo_indicador_Services import (
    CLAVE_TOTAL, UMBRAL_SUBE_REDONDEO, agregar_total_ooad, calcular_resultado, evaluar_lado, semaforizar_unidades,
)
from services.indicadorMapeo_Services import cargar_indicador_mapeo
from services.ftp.extraccion_indicador_ftp_Services import extraer_poblacion
from services.ftp.registro_errores_ftp_Services import crear_log_errores


def usa_poblacion(indicador: str) -> bool:
    return isinstance(cargar_indicador_mapeo(indicador).reporte.denominador, FuentePoblacionInfoSalud)


def actualizar_historico_con_nueva_poblacion(indicador: str, ano: str) -> tuple:
    """Retorna: (exito: bool, detalle: str, meses_actualizados: int)."""
    mapeo       = cargar_indicador_mapeo(indicador)
    denominador = mapeo.reporte.denominador
    operacion   = mapeo.reporte.operacion

    if not isinstance(denominador, FuentePoblacionInfoSalud):
        return False, "El denominador de este indicador no sale de la población", 0

    meses_nums = leer_numeradores_todos_meses(indicador, ano)
    if not meses_nums:
        return False, "Sin meses con datos en el JSON histórico", 0

    poblacion = {unidad: DatosExtraidosUnidad() for unidad in NOMBREUNIDADESARCHIVO}
    extraer_poblacion(denominador.sexo, ano, poblacion, crear_log_errores())

    nuevos_den = {}
    for unidad in NOMBREUNIDADESARCHIVO:
        try:
            nuevos_den[unidad] = evaluar_lado(operacion.denominador, poblacion[unidad].denominador, UMBRAL_SUBE_REDONDEO)
        except Exception as e:
            print(f"[RecalcPob] Error evaluando denominador para {unidad}: {e}")
            nuevos_den[unidad] = None

    for mes_str, nums_mes in meses_nums.items():
        resultados: dict[str, ResultadoUnidad] = {}
        for unidad in NOMBREUNIDADESARCHIVO:
            num = nums_mes.get(unidad)
            den = nuevos_den[unidad]
            resultados[unidad] = ResultadoUnidad(numerador=num, denominador=den, resultado=calcular_resultado(num, den, operacion.resultado))
        resultados[CLAVE_TOTAL] = agregar_total_ooad(resultados, operacion.resultado)
        guardar_mes_definitivo(indicador, ano, mes_str, semaforizar_unidades(resultados, mapeo.semaforo, mes_str))

    return True, f"{len(meses_nums)} mes(es) actualizados", len(meses_nums)
