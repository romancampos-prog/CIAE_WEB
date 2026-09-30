"""
Generar un indicador de FTP (exclusivo de FTP): extrae de los reportes, calcula,
asigna el semaforo y lo guarda en BD_CIAE (definitivo, o semanal si trae semana).
Es la unica funcion que junta las capas; cada paso vive en su propio servicio.
Usado en: ftp/controllers/reportes_controller.py
"""
from schemas.model.generacion_ftp_Model import LogErrores, ResultadoCategoria, ResultadoGeneracion
from schemas.model.reporte_mapeo_Model import FuentePoblacionInfoSalud
from services.bd_Ciae_Guardado_Services import borrar_mes_semanal, guardar_mes_definitivo, guardar_mes_semanal
from services.calculo_indicador_Services import calcular_indicador, semaforizar_unidades
from services.indicadorMapeo_Services import cargar_indicador_mapeo
from services.poblacion_Services import leer_periodo_poblacion
from services.ftp.extraccion_indicador_ftp_Services import extraer_indicador
from services.ftp.registro_errores_ftp_Services import error_de_calculo


def _poblacion_usada(mapeo, ano: str) -> str | None:
    """"Mes Año" de la poblacion vigente, solo si el indicador depende de ella y se pudo detectar."""
    if not isinstance(mapeo.reporte.denominador, FuentePoblacionInfoSalud):
        return None
    mes, anio = leer_periodo_poblacion(ano)
    return f"{mes} {anio}" if mes and anio else None


def normalizar_semana(semana: str | int | None) -> int | None:
    """La semana llega como texto del query ("", "None", "3"); None significa mes definitivo."""
    if semana is None or str(semana).strip() in ("", "None", "none"):
        return None
    return int(semana)


def generar_indicador_ftp(
    indicador: str, ano: str, mes: str, semana: str | int | None = None, guardar: bool = True,
) -> ResultadoGeneracion:
    semana_normalizada = normalizar_semana(semana)
    mapeo = cargar_indicador_mapeo(indicador)

    extraidos, errores = extraer_indicador(indicador, ano, mes, semana_normalizada, mapeo)
    resultados, errores_calculo = calcular_indicador(extraidos, mapeo.reporte.operacion)
    if errores_calculo:
        errores["CALCULO_FALLIDO"] = error_de_calculo(errores_calculo)
    unidades = semaforizar_unidades(resultados, mapeo.semaforo, mes)

    if guardar:
        poblacion_usada = _poblacion_usada(mapeo, ano)
        if semana_normalizada is None:
            guardar_mes_definitivo(indicador, ano, mes, unidades, poblacion_usada)
            borrar_mes_semanal(indicador, ano, mes)
        else:
            guardar_mes_semanal(indicador, ano, mes, semana_normalizada, unidades, poblacion_usada)

    return ResultadoGeneracion(
        indicador=indicador, ano=ano, mes=mes, semana=semana_normalizada,
        unidades=unidades, errores=errores,
    )


def consolidar_categoria(resultados: dict[str, ResultadoGeneracion | str]) -> ResultadoCategoria:
    """
    Junta lo que salio de cada indicador de la categoria: {indicador: resultado, o el mensaje si fallo}.
    Las restricciones de todos se agrupan por tipo, con la unidad marcada "indicador / unidad".
    """
    completados: list[str] = []
    errores: dict[str, str | LogErrores] = {}
    restricciones: LogErrores = {}

    for indicador, resultado in resultados.items():
        if isinstance(resultado, str):
            errores[indicador] = resultado
            continue
        completados.append(indicador)
        if not resultado.errores:
            continue
        errores[indicador] = resultado.errores
        for tipo, error in resultado.errores.items():
            agrupado = restricciones.setdefault(
                tipo, error.model_copy(update={"unidades": {}}),
            )
            for unidad, rutas in error.unidades.items():
                agrupado.unidades[f"{indicador} / {unidad}"] = rutas

    return ResultadoCategoria(completados=completados, errores=errores, restricciones=restricciones)
