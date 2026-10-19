"""
Generacion de los indicadores de FTP (exclusivo de FTP): extrae de los reportes SIAIS,
calcula, asigna el semaforo y guarda en BD_CIAE (definitivo, o semanal si trae semana).
Aqui viven los servicios de los endpoints de /Indicadores/ftp (menos poblacion/*, que estan
en services/poblacion_Services.py).
Usado en: Controller/ftp_Controller.py
"""
from fastapi import HTTPException

from schemas.model.generacion_Model import (
    CorteExtractorRecalculado, ErrorExtraccion, IndicadorGenerarFTP, IndicadorRecalculado,
    ResultadoCategoria, ResultadoGeneracion, ResultadoRecalculoPoblacion, RutaAfectada,
)
from schemas.model.reporte_mapeo_Model import FuenteArchivosFTP, FuentePoblacionInfoSalud
from services.bd_Ciae_Guardado_Services import (
    borrar_mes_semanal, guardar_mes_definitivo, guardar_mes_semanal, leer_numeradores_todos_meses,
)
from services.calculo_indicador_Services import calcular_indicador, calcular_unidades
from services.extractor.corte_extractor_Services import recalcular_cortes_con_poblacion
from services.ftp.extraccion_indicador_ftp_Services import extraer_indicador
from services.ftp.navegacion_ftp_Services import codigo_base
from services.indicadorMapeo_Services import todos_los_indicadores, cargar_indicador_mapeo, indicadores_del_modulo
from services.poblacion_Services import denominador_de_poblacion, leer_periodo_poblacion, texto_poblacion_vigente
from shared.MESES import MESES_ESTANDAR
from shared.semaforo_service import semaforizar_unidades
from shared.UNIDADES import NOMBREUNIDADESARCHIVO
from shared.validarArchivo_service import exigir_contrasena


def indicadores_para_generar() -> list[IndicadorGenerarFTP]:
    """Lo comun del mapeo de cada indicador de FTP mas los reportes SIAIS que lee."""
    lista = []
    for base in indicadores_del_modulo("ftp"):
        reporte = cargar_indicador_mapeo(base.indicador).reporte
        # "CP03_A"/"CP03_B" son dos hojas del mismo reporte: se lista una vez como "CP03".
        reportes = []
        for fuente in (reporte.numerador, reporte.denominador):
            if not isinstance(fuente, FuenteArchivosFTP):
                continue
            for codigo in fuente.archivo:
                if codigo_base(codigo) not in reportes:
                    reportes.append(codigo_base(codigo))
        lista.append(IndicadorGenerarFTP(**base.model_dump(), reportes=reportes))
    return lista


##--------------------------------------

def generar_indicador_ftp(indicador: str, ano: str, mes: str, semana: str | int | None = None) -> ResultadoGeneracion:
    """Genera un indicador de un mes (semanal si trae semana) y lo guarda; regresa sus unidades y restricciones."""
    # 1. Validar lo recibido: la semana llega como texto ("", "None", "3"); sin semana es el mes definitivo
    semana = None if semana is None or str(semana).strip() in ("", "None", "none") else int(semana)

    # 2. Leer el mapeo
    mapeo = cargar_indicador_mapeo(indicador)

    # 3. Extracción (numerador y denominador): los reportes del FTP de las 46 unidades
    extraidos, errores = extraer_indicador(indicador, ano, mes, semana, mapeo)

    # 4. Cálculo del resultado: las formulas del mapeo por unidad y el TOTAL_OOAD
    resultados, errores_calculo = calcular_indicador(extraidos, mapeo.reporte.operacion)
    if errores_calculo:
        unidades_con_error = {}
        for unidad, mensaje in errores_calculo.items():
            unidades_con_error[unidad] = [RutaAfectada(reportes=["cálculo"], ruta=mensaje)]
        errores["CALCULO_FALLIDO"] = ErrorExtraccion(
            nombreError="Error de cálculo",
            descripcionError="Falló la evaluación de la fórmula del indicador para estas unidades.",
            unidades=unidades_con_error,
        )

    # 5. Semaforización
    unidades = semaforizar_unidades(resultados, mapeo.semaforo, mes)

    # 6. Guardado en BD_CIAE: el definitivo borra el semanal de ese mes
    poblacion_usada = texto_poblacion_vigente(ano) if isinstance(mapeo.reporte.denominador, FuentePoblacionInfoSalud) else None
    if semana is None:
        guardar_mes_definitivo(indicador, ano, mes, unidades, poblacion_usada)
        borrar_mes_semanal(indicador, ano, mes)
    else:
        guardar_mes_semanal(indicador, ano, mes, semana, unidades, poblacion_usada)

    return ResultadoGeneracion(indicador=indicador, ano=ano, mes=mes, semana=semana, unidades=unidades, errores=errores)


##--------------------------------------

def generar_indicador(indicador: str, ano: str, mes: str, semana: str | None = None, accion: str = "generado") -> tuple[str, dict]:
    """Endpoint de generar un indicador: regresa (mensaje, datos) con las restricciones encontradas."""
    # Pasos 1 a 6 (validar, mapeo, extraccion, calculo, semaforo y guardado) en generar_indicador_ftp
    resultado = generar_indicador_ftp(indicador, ano, mes, semana)

    # 7. Auditoría y respuesta
    return f"Reporte {indicador} {accion} correctamente", {"restricciones": resultado.errores}


##--------------------------------------

def regenerar_indicador(usuario: str | None, password: str, indicador: str, ano: str, mes: str) -> tuple[str, dict]:
    """Endpoint de regenerar un mes definitivo ya generado; regresa (mensaje, datos)."""
    # 1. Validar lo recibido: regenerar sobrescribe datos, asi que pide la contraseña
    exigir_contrasena(usuario, password)

    # Pasos 2 a 7 iguales que generar
    return generar_indicador(indicador, ano, mes, None, "regenerado")


##--------------------------------------

def generar_categoria(categoria: str, ano: str, mes: str, semana: str | None = None) -> tuple[bool, str, dict]:
    """Endpoint de generar todos los indicadores de una categoria, uno tras otro; regresa (exito, mensaje, datos)."""
    # 2. Leer el mapeo: los indicadores de FTP de la categoria
    categoria_ftp = None
    for familia in todos_los_indicadores("mostrarGenerar", "ftp"):
        if familia.categoriaIndicador == categoria:
            categoria_ftp = familia
            break
    if not categoria_ftp:
        raise HTTPException(status_code=404, detail=f"Categoría '{categoria}' no encontrada")

    # Pasos 3 a 6 de cada indicador en generar_indicador_ftp; si uno falla los demas siguen
    resultados: dict[str, ResultadoGeneracion | str] = {}
    for indicador in categoria_ftp.indicadores:
        try:
            resultados[indicador] = generar_indicador_ftp(indicador, ano, mes, semana)
        except Exception as error:
            resultados[indicador] = str(error)

    # 7. Auditoría y respuesta: las restricciones de todos se agrupan por tipo, con la unidad
    #    marcada "indicador / unidad"
    generada = ResultadoCategoria(completados=[])
    for indicador, resultado in resultados.items():
        if isinstance(resultado, str):
            generada.errores[indicador] = resultado
            continue
        generada.completados.append(indicador)
        if not resultado.errores:
            continue
        generada.errores[indicador] = resultado.errores
        for tipo, error in resultado.errores.items():
            if tipo not in generada.restricciones:
                generada.restricciones[tipo] = error.model_copy(update={"unidades": {}})
            for unidad, rutas in error.unidades.items():
                generada.restricciones[tipo].unidades[f"{indicador} / {unidad}"] = rutas

    if not generada.completados:
        return False, "Ningún indicador pudo generarse", {"errores": generada.errores}
    return True, "Categoría generada", generada.model_dump()


##--------------------------------------

def regenerar_categoria(usuario: str | None, password: str, categoria: str, ano: str, mes: str) -> tuple[bool, str, dict]:
    """Endpoint de regenerar el mes definitivo de una categoria ya generada; regresa (exito, mensaje, datos)."""
    # 1. Validar lo recibido: pide la contraseña
    exigir_contrasena(usuario, password)

    # Pasos 2 a 7 iguales que generar la categoria
    return generar_categoria(categoria, ano, mes, None)


##--------------------------------------

def actualizar_historico_con_nueva_poblacion(indicador: str, ano: str) -> tuple[bool, str, int]:
    """
    Recalcula con la poblacion actual los meses ya guardados de un indicador cuyo denominador
    sale de la poblacion (el numerador es el guardado, no se va al FTP). La poblacion aplica
    "hacia adelante": solo los meses >= al mes/año detectado del reporte de poblacion (si no
    se detecto, todos). Regresa (exito, detalle, meses actualizados).
    """
    # 2. Leer el mapeo
    mapeo = cargar_indicador_mapeo(indicador)
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
                if not isinstance(cargar_indicador_mapeo(indicador).reporte.denominador, FuentePoblacionInfoSalud):
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
