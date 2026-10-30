"""
Subir el SUI-13 de un mes para un indicador anualizado con el Censo DM de denominador (DM 05):
cada caso se guarda en el mes de su fecha de ingreso, y se genera el mes y los 11 siguientes
cuya ventana ya este completa (el archivo entra en las 12 ventanas que lo incluyen).
Usado en: services/extractor/subir_archivo_extractor_Services.py
"""
from datos.bd_ciae.extractor_Datos import guardar_parte_mes, leer_partes
from datos.excel_subido.lector_excel_Datos import LectorExcel
from schemas.model.mapeo_extractor_Model import IndicadorExtractorMapeo
from services.extractor.conteo_por_unidad_Services import contar_por_unidad_y_mes_de_fecha
from services.extractor.generar_mensual_Services import resultado_pendiente
from services.extractor.mes_anualizado_censo_Services import generar_mes_anualizado_censo
from shared.MESES import mes_desplazado


def procesar_anualizado_con_censo(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str,
                                   lector: LectorExcel) -> dict:

    # 1. Conteo del archivo por mes de ingreso, guardado como la parte "numerador" del mes del archivo
    conteo = contar_por_unidad_y_mes_de_fecha(lector, mapeo.reporte.numerador.model_dump(), anio, mes_nombre)
    guardar_parte_mes(indicador, anio, mes_nombre, "numerador", conteo)

    # 2. Este mes y los 11 siguientes: las ventanas que incluyen al archivo (entre este año y el siguiente)
    partes_por_anio = {anio_partes: leer_partes(indicador, anio_partes) for anio_partes in (anio - 1, anio, anio + 1)}
    resultado, aviso = generar_mes_anualizado_censo(indicador, mapeo, anio, mes_nombre, partes_por_anio)
    otros = []

    for k in range(1, 12):
        mes_siguiente, anio_siguiente = mes_desplazado(mes_nombre, anio, k)
        generado, _ = generar_mes_anualizado_censo(indicador, mapeo, anio_siguiente, mes_siguiente, partes_por_anio)
        if generado:
            otros.append(f"{mes_siguiente} {anio_siguiente}")

    # 3. Respuesta
    tambien = f" También quedó generado {', '.join(otros)}." if otros else ""

    if resultado:
        inicio = mes_desplazado(mes_nombre, anio, -11)
        return {**resultado, "detalle": f"Ingresos de {inicio[0]} {inicio[1]} a {mes_nombre} {anio}.{tambien}"}

    return resultado_pendiente(indicador, anio, mes_nombre, {}, f"Se guardó {mes_nombre} {anio}. Para reportarlo {aviso}{tambien}")
