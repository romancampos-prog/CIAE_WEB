"""
Indicador mensual con numerador y denominador en archivos distintos, o anualizado (Neonatal 06):
cada archivo guarda su lado y el mes se genera cuando ya esta lo que falta; el anualizado suma
la ventana de 12 meses y genera o recalcula los 11 meses siguientes.
Usado en: services/extractor/subir_archivo_extractor_Services.py
"""
from datos.bd_ciae.extractor_partes_Datos import guardar_parte_mes, leer_partes
from datos.excel_subido.lector_excel_Datos import LectorExcel
from schemas.model.mapeo_extractor_Model import IndicadorExtractorMapeo
from services.extractor.catalogo_extractor_Services import ANUALIZADO, nombre_archivo
from services.extractor.conteo_por_unidad_Services import contar_por_unidad
from services.extractor.generar_mensual_Services import calcular_y_guardar_mes, resultado_pendiente
from shared.MESES import mes_desplazado
from shared.reglas_periodicidad import clave_periodicidad


def _aviso_lado_faltante(mapeo: IndicadorExtractorMapeo, partes_del_mes: dict, mes_nombre: str) -> str | None:
    faltan = [lado for lado in ("numerador", "denominador") if lado not in partes_del_mes]

    if not faltan:
        return None

    fuente_faltante = mapeo.reporte.numerador if faltan[0] == "numerador" else mapeo.reporte.denominador
    archivo_faltante = nombre_archivo(fuente_faltante.archivo)
    return (f"Se guardó el {'denominador' if faltan == ['numerador'] else 'numerador'} de {mes_nombre}. "
            f"Falta subir el {archivo_faltante} de {mes_nombre} para generar el mes.")


##--------------------------------------

def _generar_anualizado(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str,
                        partes_por_anio: dict) -> tuple[dict | None, list[str]]:
    """Suma los 12 meses de la ventana y guarda el mes; (None, meses que faltan) si la ventana no esta completa."""

    ventana = [mes_desplazado(mes_nombre, anio, -k) for k in range(11, -1, -1)]
    faltan = []

    for mes, anio_mes in ventana:
        partes_del_mes = partes_por_anio[anio_mes].get(mes, {})
        if "numerador" not in partes_del_mes or "denominador" not in partes_del_mes:
            faltan.append(f"{mes} {anio_mes}")

    if faltan:
        return None, faltan

    numerador, denominador = {}, {}

    for mes, anio_mes in ventana:
        partes_del_mes = partes_por_anio[anio_mes][mes]
        for unidad, cantidad in partes_del_mes["numerador"].items():
            numerador[unidad] = numerador.get(unidad, 0) + cantidad
        for unidad, cantidad in partes_del_mes["denominador"].items():
            denominador[unidad] = denominador.get(unidad, 0) + cantidad

    return calcular_y_guardar_mes(indicador, mapeo, anio, mes_nombre, numerador, denominador), []


##--------------------------------------

def procesar_mes_por_partes(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str,
                             lector: LectorExcel, archivo: str) -> dict:
    """
    Indicador mensual con numerador y denominador en archivos distintos (Neonatal 06:
    Defunciones / Nacimientos) o anualizado: cuenta el lado que trae este archivo, lo guarda
    y, si ya esta lo que falta, genera el mes. Da igual que archivo se suba primero.
    """

    partes = {}

    for lado, fuente in (("numerador", mapeo.reporte.numerador), ("denominador", mapeo.reporte.denominador)):
        if fuente.archivo == archivo:
            partes = guardar_parte_mes(indicador, anio, mes_nombre, lado, contar_por_unidad(lector, fuente.model_dump(), anio, mes_nombre))

    if clave_periodicidad(mapeo.periodicidad) != ANUALIZADO:
        aviso = _aviso_lado_faltante(mapeo, partes, mes_nombre)
        if aviso:
            return resultado_pendiente(indicador, anio, mes_nombre, partes, aviso)
        return calcular_y_guardar_mes(indicador, mapeo, anio, mes_nombre, partes["numerador"], partes["denominador"])

    # Anualizado: el mes se reporta con sus ultimos 12 meses. Ademas entra en la ventana de los
    # 11 siguientes: si ya estaban completos se recalculan, y si era el que les faltaba se generan.
    # Las ventanas de este mes y de los 11 siguientes caen entre el año anterior y el siguiente.
    partes_por_anio = {anio_partes: leer_partes(indicador, anio_partes) for anio_partes in (anio - 1, anio, anio + 1)}

    resultado, faltan = _generar_anualizado(indicador, mapeo, anio, mes_nombre, partes_por_anio)
    otros = []

    for k in range(1, 12):
        mes_siguiente, anio_siguiente = mes_desplazado(mes_nombre, anio, k)
        generado, _ = _generar_anualizado(indicador, mapeo, anio_siguiente, mes_siguiente, partes_por_anio)
        if generado:
            otros.append(f"{mes_siguiente} {anio_siguiente}")

    if len(otros) == 1:
        tambien = f" También quedó generado {otros[0]}."
    elif otros:
        tambien = f" También quedaron generados {', '.join(otros)}."
    else:
        tambien = ""

    if resultado:
        inicio = mes_desplazado(mes_nombre, anio, -11)
        return {**resultado, "detalle": f"Suma de {inicio[0]} {inicio[1]} a {mes_nombre} {anio}.{tambien}"}

    aviso = _aviso_lado_faltante(mapeo, partes, mes_nombre) or (
        f"Se guardó {mes_nombre} {anio}. Para reportarlo "
        f"{'falta 1' if len(faltan) == 1 else f'faltan {len(faltan)}'} de sus 12 meses: {', '.join(faltan)}.")

    return resultado_pendiente(indicador, anio, mes_nombre, partes, aviso + tambien)
