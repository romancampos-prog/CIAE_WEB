"""
Recalcula el denominador de los indicadores cuyo denominador sale de la
poblacion InfoSalud (fuente "poblacionInfoSalud" en el mapeo unificado),
usando el numerador ya guardado en el JSON historico y el POBLACION_{anio}.json
actualizado. NO accede al FTP. Guarda de vuelta numerador, denominador,
resultado, color y TOTAL_OOAD de cada mes ya cerrado, con las mismas reglas que
la generacion normal.
Usado en: ftp/controllers/reportes_controller.py  (/recalcular-poblacion)
"""
from ftp.config import NOMBREUNIDADESARCHIVO
from ftp.services.datos_json_service import guardar_datos_en_json, leer_numeradores_todos_meses
from ftp.services.ftp_extraer import crear_log_errores
from ftp.services.ftp_extraer_unificado import extraer_poblacion
from ftp.services.mapeo_ftp import cargar_indicador_mapeo
from ftp.services.numerador_denominador import AgregarTotalOOAD
from ftp.services.numerador_denominador_unificado import calcular_resultado, evaluar_lado
from ftp.services.semaforizado import Semaforizado
from schemas.model.reporte_mapeo_Model import FuentePoblacionInfoSalud

UMBRAL_SUBE_REDONDEO = 0.60


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

    poblacion = {unidad: {"denominador": {}} for unidad in NOMBREUNIDADESARCHIVO}
    extraer_poblacion(denominador.sexo, ano, poblacion, crear_log_errores())

    nuevos_den = {}
    for unidad in NOMBREUNIDADESARCHIVO:
        try:
            nuevos_den[unidad] = evaluar_lado(operacion.denominador, poblacion[unidad]["denominador"], UMBRAL_SUBE_REDONDEO)
        except Exception as e:
            print(f"[RecalcPob] Error evaluando denominador para {unidad}: {e}")
            nuevos_den[unidad] = None

    for mes_str, nums_mes in meses_nums.items():
        resultados = {}
        for unidad in NOMBREUNIDADESARCHIVO:
            num = nums_mes.get(unidad)
            den = nuevos_den[unidad]
            resultados[unidad] = {"numerador": num, "denominador": den, "resultado": calcular_resultado(num, den, operacion.resultado)}
        AgregarTotalOOAD(resultados, operacion.resultado)
        Semaforizado(resultados, mapeo.semaforo, mes_str)
        guardar_datos_en_json(indicador, ano, mes_str, resultados)

    return True, f"{len(meses_nums)} mes(es) actualizados", len(meses_nums)
