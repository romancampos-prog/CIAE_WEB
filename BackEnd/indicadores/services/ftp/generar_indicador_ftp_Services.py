"""
Generar (o regenerar) un indicador de FTP de un mes: extrae de los reportes SIAIS, calcula,
asigna el semaforo y guarda en BD_CIAE (definitivo, o semanal si trae semana).
Usado en: Controller/ftp_Controller.py, services/ftp/generar_categoria_ftp_Services.py
"""
from compartido.validar_archivo_Services import exigir_contrasena
from datos.bd_ciae.guardar_mes_Datos import guardar_mes_definitivo
from datos.bd_ciae.poblacion_Datos import texto_poblacion_vigente
from datos.bd_ciae.semanal_Datos import borrar_mes_semanal, guardar_mes_semanal
from datos.lectura_mapeo.mapeo_por_modulo_Datos import cargar_indicador_ftp
from schemas.model.generacion_ftp_Model import ErrorExtraccion, ResultadoGeneracion, RutaAfectada
from schemas.model.mapeo_comun_Model import FuentePoblacionInfoSalud
from services.compartido.semaforo.color_semaforo_Services import semaforizar_unidades
from services.ftp.calcular_indicador_ftp_Services import calcular_indicador
from services.ftp.extraer_indicador_ftp_Services import extraer_indicador


def generar_indicador_ftp(indicador: str, ano: str, mes: str, semana: str | int | None = None) -> ResultadoGeneracion:
    """Genera un indicador de un mes (semanal si trae semana) y lo guarda; regresa sus unidades y restricciones."""

    # 1. Validar lo recibido: la semana llega como texto ("", "None", "3"); sin semana es el mes definitivo
    semana = None if semana is None or str(semana).strip() in ("", "None", "none") else int(semana)

    # 2. Leer el mapeo
    mapeo = cargar_indicador_ftp(indicador)

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
