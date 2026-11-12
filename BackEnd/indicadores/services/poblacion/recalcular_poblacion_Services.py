"""
Recalcular con la poblacion nueva lo que ya estaba guardado: los meses de FTP cuyo denominador
sale de la poblacion y los cortes del Extractor que la usan.
Usado en: Controller/poblacion_Controller.py
"""
from datos.bd_ciae.guardar_mes_Datos import guardar_mes_definitivo
from datos.bd_ciae.historico_indicador_Datos import leer_numeradores_todos_meses
from datos.bd_ciae.poblacion_Datos import leer_periodo_poblacion, texto_poblacion_vigente
from datos.lectura_mapeo.mapeo_por_modulo_Datos import cargar_indicador_ftp
from schemas.model.mapeo_comun_Model import FuentePoblacionInfoSalud
from schemas.model.poblacion_Model import CorteExtractorRecalculado, IndicadorRecalculado, ResultadoRecalculoPoblacion
from services.calculo.resultado_unidades_Services import calcular_unidades
from services.extractor.corte_semestral_Services import recalcular_cortes_con_poblacion
from services.informacion.lista_indicadores_Services import todos_los_indicadores
from services.poblacion.denominador_poblacion_Services import denominador_de_poblacion
from services.semaforo.color_semaforo_Services import semaforizar_unidades
from shared.MESES import MESES_ESTANDAR
from shared.UNIDADES import NOMBREUNIDADESARCHIVO


def actualizar_historico_con_nueva_poblacion(indicador: str, ano: str) -> tuple[bool, str, int]:
    """
    Recalcula con la poblacion actual los meses ya guardados de un indicador cuyo denominador
    sale de la poblacion (el numerador es el guardado, no se va al FTP). La poblacion aplica
    "hacia adelante": solo los meses >= al mes/año detectado del reporte de poblacion (si no
    se detecto, todos). Regresa (exito, detalle, meses actualizados).
    """

    # 2. Leer el mapeo
    mapeo = cargar_indicador_ftp(indicador)

    if not isinstance(mapeo.reporte.denominador, FuentePoblacionInfoSalud):
        return False, "El denominador de este indicador no sale de la población", 0

    # 3. Extracción: numeradores ya guardados (de los meses que le tocan a esta poblacion) y denominador de la poblacion
    meses_nums = leer_numeradores_todos_meses(indicador, ano)

    if not meses_nums:
        return False, "Sin meses con datos en el JSON histórico", 0

    mes_poblacion, anio_poblacion = leer_periodo_poblacion(ano)

    if mes_poblacion is not None and anio_poblacion is not None:
        if int(ano) < anio_poblacion:
            meses_nums = {}
        elif int(ano) == anio_poblacion:
            mes_minimo = MESES_ESTANDAR.index(mes_poblacion) + 1
            meses_nums = {mes: datos for mes, datos in meses_nums.items() if int(mes) >= mes_minimo}

    if not meses_nums:
        return True, f"La población es de {mes_poblacion} {anio_poblacion} -- ningún mes de {ano} le corresponde todavía", 0

    operacion = mapeo.reporte.operacion
    denominadores = denominador_de_poblacion(mapeo.reporte.denominador.sexo, operacion.denominador, ano)
    poblacion_usada = texto_poblacion_vigente(ano)

    for mes, numeradores in meses_nums.items():
        # 4. Cálculo del resultado
        resultados = calcular_unidades(numeradores, denominadores, operacion.resultado, unidades=NOMBREUNIDADESARCHIVO)

        # 5. Semaforización
        semaforizadas = semaforizar_unidades(resultados, mapeo.semaforo, mes)

        # 6. Guardado en BD_CIAE
        guardar_mes_definitivo(indicador, ano, mes, semaforizadas, poblacion_usada)

    return True, f"{len(meses_nums)} mes(es) actualizados", len(meses_nums)


##--------------------------------------

def recalcular_poblacion(ano: str) -> tuple[str, dict]:
    """Endpoint de recalcular con la poblacion nueva (FTP y cortes del Extractor); regresa (mensaje, datos)."""

    recalculados: list[IndicadorRecalculado] = []
    errores: list[str] = []

    # Pasos 2 a 6 en actualizar_historico_con_nueva_poblacion: indicadores de FTP cuyo denominador sale de la poblacion
    for familia in todos_los_indicadores("mostrarGenerar", "ftp"):
        for indicador in familia.indicadores:
            try:
                if not isinstance(cargar_indicador_ftp(indicador).reporte.denominador, FuentePoblacionInfoSalud):
                    continue
                ok, detalle, n_meses = actualizar_historico_con_nueva_poblacion(indicador, ano)

                if ok:
                    recalculados.append(IndicadorRecalculado(indicador=indicador, meses=n_meses, detalle=detalle))
                else:
                    errores.append(f"{indicador}: {detalle}")
            except Exception as error:
                errores.append(f"{indicador}: {str(error)}")

    # Pasos 2 a 6 en recalcular_cortes_con_poblacion: cortes del Extractor ya generados con la poblacion de ese año
    cortes_extractor: list[CorteExtractorRecalculado] = []

    try:
        for corte in recalcular_cortes_con_poblacion(int(ano)):
            cortes_extractor.append(CorteExtractorRecalculado(**corte))
    except Exception as error:
        errores.append(f"Extractor: {str(error)}")

    # 7. Auditoría y respuesta
    total_meses = sum(recalculado.meses for recalculado in recalculados)
    resultado = ResultadoRecalculoPoblacion(total=total_meses, recalculados=recalculados, errores=errores, cortes_extractor=cortes_extractor)

    return "Recálculo completado", resultado.model_dump()
