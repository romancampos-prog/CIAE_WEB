"""
Sobrevida a 28 dias (Neonatal 04): el reporte del mes M lleva a los nacidos del periodo anterior
menos las defunciones de ESOS bebes, acomodadas por su fecha de nacimiento. Cada archivo deja su
parte en el mes del reporte que le toca y el mes se genera cuando ya estan sus 4 archivos.
Usado en: services/extractor/subir_archivo_extractor_Services.py, services/extractor/estado_archivos_Services.py
"""
from datos.bd_ciae.extractor_Datos import guardar_parte_mes, leer_partes
from datos.excel_subido.lector_excel_Datos import LectorExcel
from schemas.model.mapeo_extractor_Model import IndicadorExtractorMapeo
from services.extractor.catalogo_extractor_Services import nombre_archivo
from services.extractor.conteo_por_unidad_Services import contar_por_unidad, contar_por_unidad_y_mes_de_nacimiento
from services.extractor.generar_mensual_Services import calcular_y_guardar_mes, resultado_pendiente
from shared.MESES import MESES_ESTANDAR, mes_desplazado
from shared.UNIDADES import CATALOGOS_UNIDADES


def clave_defunciones(anio: int, mes_nombre: str) -> str:
    """Nombre con que se guarda, en el mes del reporte, lo que aporto un archivo de Defunciones."""
    return f"defunciones_del_archivo_{anio}_{MESES_ESTANDAR.index(mes_nombre) + 1:02d}"


##--------------------------------------

def _generar_mes_con_desfase(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str) -> tuple[dict | None, str | None]:
    """
    Genera el mes del reporte si ya estan sus archivos: los Nacimientos del periodo anterior y
    las Defunciones de los 3 meses donde pueden venir esos bebes (el reporte, el anterior y el
    de dos meses antes). Regresa (resultado, None) o (None, aviso con lo que falta).
    """

    partes_del_mes = leer_partes(indicador, anio).get(mes_nombre, {})
    desfase = mapeo.reporte.denominador.model_extra["mesDelReporte"]["desfaseMeses"]
    faltan = []

    if "denominador" not in partes_del_mes:
        mes_archivo, anio_archivo = mes_desplazado(mes_nombre, anio, -desfase)
        faltan.append(f"{nombre_archivo(mapeo.reporte.denominador.archivo)} de {mes_archivo} {anio_archivo}")

    defunciones: dict[str, int] = {}

    for meses_antes in (2, 1, 0):
        mes_archivo, anio_archivo = mes_desplazado(mes_nombre, anio, -meses_antes)
        clave = clave_defunciones(anio_archivo, mes_archivo)

        if clave not in partes_del_mes:
            faltan.append(f"{nombre_archivo(mapeo.reporte.numerador.archivo)} de {mes_archivo} {anio_archivo}")
            continue

        for unidad, cantidad in partes_del_mes[clave].items():
            defunciones[unidad] = defunciones.get(unidad, 0) + cantidad

    if faltan:
        return None, f"{mes_nombre} {anio}: falta subir {', '.join(faltan)}."

    return calcular_y_guardar_mes(indicador, mapeo, anio, mes_nombre, defunciones, partes_del_mes["denominador"]), None


##--------------------------------------

def procesar_con_desfase(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str,
                          lector: LectorExcel, archivo: str) -> dict:
    """
    Sobrevida a 28 dias (Neonatal 04): el reporte del mes M lleva a los nacidos del periodo
    anterior (Nacimientos de M-1) menos las defunciones de ESOS bebes, que se acomodan por su
    fecha de nacimiento y pueden venir en las Defunciones de M-2, M-1 y M. Cada archivo deja su
    parte en el mes del reporte que le toca; el mes se genera cuando ya estan sus 4 archivos.
    """

    numerador, denominador = mapeo.reporte.numerador, mapeo.reporte.denominador
    meses_del_reporte = []

    # 1. Extracción de Nacimientos: van al mes del archivo + el desfase (enero -> febrero)
    if denominador.archivo == archivo:
        mes_reporte, anio_reporte = mes_desplazado(mes_nombre, anio, denominador.model_extra["mesDelReporte"]["desfaseMeses"])
        guardar_parte_mes(indicador, anio_reporte, mes_reporte, "denominador",
                          contar_por_unidad(lector, denominador.model_dump(), anio, mes_nombre))
        meses_del_reporte.append((mes_reporte, anio_reporte))

    # 2. Extracción de Defunciones: cada una al mes del reporte de su nacimiento. El archivo deja
    #    su parte (aunque sea 0) en los 3 meses que puede tocar, para saber que ya se subio.
    if numerador.archivo == archivo:
        por_mes = contar_por_unidad_y_mes_de_nacimiento(lector, numerador.model_dump(), anio, mes_nombre)
        en_cero = {nombre: 0 for nombre in CATALOGOS_UNIDADES[numerador.catalogoUnidades].values()}

        for meses_despues in (0, 1, 2):
            mes_reporte, anio_reporte = mes_desplazado(mes_nombre, anio, meses_despues)
            guardar_parte_mes(indicador, anio_reporte, mes_reporte, clave_defunciones(anio, mes_nombre),
                              por_mes.get((anio_reporte, mes_reporte), en_cero))
            meses_del_reporte.append((mes_reporte, anio_reporte))

    # 3. Cálculo, semaforización y guardado de cada mes del reporte que ya tenga sus archivos
    generados, avisos, ultimo_resultado = [], [], None

    for mes_reporte, anio_reporte in meses_del_reporte:
        resultado, aviso = _generar_mes_con_desfase(indicador, mapeo, anio_reporte, mes_reporte)

        if resultado:
            generados.append(f"{mes_reporte} {anio_reporte}")
            ultimo_resultado = resultado
        else:
            avisos.append(aviso)

    # 4. Respuesta: que meses del reporte quedaron y que falta para los demas
    texto = f"Se generó {', '.join(generados)}." if generados else ""

    if avisos:
        texto += (" " if texto else "") + " ".join(avisos)
    if ultimo_resultado:
        return {**ultimo_resultado, "detalle": texto}

    return resultado_pendiente(indicador, anio, mes_nombre, {}, texto)
