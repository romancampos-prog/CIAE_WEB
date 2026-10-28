"""
Subir el Egresos por separado: completa la via 2 de cada indicador con cruce con lo que dejo el
SUI-13 de ese mes, guarda el mes y genera o recalcula el corte.
Usado en: Controller/extractor_Controller.py
"""
from compartido.validar_archivo_Services import validar_archivo_subido
from datos.bd_ciae.extractor_Datos import leer_pendiente_cruce
from datos.excel_subido.lector_excel_Datos import LectorExcel
from datos.lectura_mapeo.mapeo_por_modulo_Datos import cargar_indicador_extractor
from services.extractor.catalogo_extractor_Services import configuracion_cruce, indicadores_extractor
from services.extractor.generar_corte_Services import guardar_mes_de_corte, sumar_validados
from services.extractor.subir_archivo_extractor_Services import respuesta_de_subida, validar_mes


def completar_cruce(usuario: str | None, anio: int, mes: str, nombre_archivo: str, contenido: bytes, peso: int) -> tuple[str, dict]:
    """
    Endpoint de subir el Egresos por separado: para cada indicador con cruce toma la via 1 y
    los candidatos que dejo el SUI-13 de ese mes, los cruza contra este archivo, guarda el mes
    completo y genera/recalcula el corte. Si un indicador falla, los demas siguen.
    """

    # 1. Validar el mes y el archivo
    validar_mes(mes)
    validar_archivo_subido(contenido, peso, nombre_archivo, "Egresos Pacientes")

    # 2. Cruzar lo que dejo el SUI-13 de cada indicador con cruce
    lector_cruce = LectorExcel(contenido)
    resultados = {}

    for indicador in indicadores_extractor():
        mapeo = cargar_indicador_extractor(indicador)
        if not configuracion_cruce(mapeo):
            continue

        try:
            pendiente = leer_pendiente_cruce(indicador, anio, mes)

            if pendiente is None:
                raise ValueError(f"No hay SUI-13 de {mes} {anio} procesado para {indicador}: súbelo primero.")

            conteo, validados = sumar_validados(pendiente["via1"], pendiente["candidatos"], lector_cruce, configuracion_cruce(mapeo))
            resultados[indicador] = guardar_mes_de_corte(indicador, anio, mes, conteo, len(pendiente["candidatos"]), validados, True)
        except (FileNotFoundError, KeyError, ValueError) as exc:
            resultados[indicador] = {"indicador": indicador, "anio": anio, "mes": mes, "error": str(exc)}

    # 3. Auditar y armar el mensaje
    return respuesta_de_subida(resultados, mes, anio, usuario, f"archivo=extractor-cruce({mes} {anio}, {nombre_archivo}) bytes={len(contenido)}")
