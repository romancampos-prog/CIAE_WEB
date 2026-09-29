"""
Recalcula el denominador de los indicadores cuyo denominador sale de la
poblacion InfoSalud (fuente "poblacionInfoSalud" en el mapeo unificado),
usando el numerador ya guardado en el JSON historico y el POBLACION_{anio}.json
actualizado. NO accede al FTP. Guarda de vuelta numerador, denominador,
resultado, color y TOTAL_OOAD de cada mes ya cerrado, con las mismas reglas que
la generacion normal.

La poblacion vigente aplica "hacia adelante": solo se recalculan los meses
>= al mes/año detectado del titulo del reporte de poblacion (ver
poblacion_Services.leer_periodo_poblacion) -- los meses anteriores conservan
el denominador que tenian cuando se generaron, no se reescriben con una
poblacion que en ese momento todavia no existia. Si no se pudo detectar el
mes/año (advertencia_titulo al subir), no se restringe nada -- se recalculan
todos los meses, igual que antes de esta regla.
Usado en: Controller/ftp_Controller.py
"""
from shared.MESES import MESES_ESTANDAR
from shared.unidades_ftp import NOMBREUNIDADESARCHIVO
from schemas.model.generacion_ftp_Model import DatosExtraidosUnidad, ResultadoUnidad
from schemas.model.reporte_mapeo_Model import FuentePoblacionInfoSalud
from services.bd_Ciae_Guardado_Services import guardar_mes_definitivo, leer_numeradores_todos_meses
from services.calculo_indicador_Services import (
    CLAVE_TOTAL, UMBRAL_SUBE_REDONDEO, agregar_total_ooad, calcular_resultado, evaluar_lado, semaforizar_unidades,
)
from services.indicadorMapeo_Services import cargar_indicador_mapeo
from services.poblacion_Services import leer_periodo_poblacion
from services.ftp.extraccion_indicador_ftp_Services import extraer_poblacion
from services.ftp.registro_errores_ftp_Services import crear_log_errores


def usa_poblacion(indicador: str) -> bool:
    return isinstance(cargar_indicador_mapeo(indicador).reporte.denominador, FuentePoblacionInfoSalud)


def _meses_desde(meses_nums: dict, ano_solicitado: int, mes_poblacion: str | None, anio_poblacion: int | None) -> dict:
    """
    Filtra meses_nums ({"01": {...}, ...}) dejando solo los meses >= la fecha de
    la poblacion vigente. Si no se detecto mes/año de la poblacion, no filtra
    nada (comportamiento anterior a esta regla).
    """
    if mes_poblacion is None or anio_poblacion is None:
        return meses_nums
    if ano_solicitado < anio_poblacion:
        return {}  # el año pedido es ANTERIOR a la poblacion -- todavia no aplica
    if ano_solicitado > anio_poblacion:
        return meses_nums  # el año pedido es POSTERIOR -- la poblacion ya es pasado, aplica completo
    mes_minimo = MESES_ESTANDAR.index(mes_poblacion) + 1
    return {mes: datos for mes, datos in meses_nums.items() if int(mes) >= mes_minimo}


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

    mes_poblacion, anio_poblacion = leer_periodo_poblacion(ano)
    meses_nums = _meses_desde(meses_nums, int(ano), mes_poblacion, anio_poblacion)
    if not meses_nums:
        return True, f"La población es de {mes_poblacion} {anio_poblacion} -- ningún mes de {ano} le corresponde todavía", 0

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
