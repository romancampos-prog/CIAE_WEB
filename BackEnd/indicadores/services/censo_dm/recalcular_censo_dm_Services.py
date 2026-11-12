"""
Con un censo nuevo, generar o recalcular los meses de los indicadores que lo usan de denominador
(DM 05): el censo de un año se usa en diciembre de ese año y de enero a noviembre del siguiente.
Usado en: services/censo_dm/archivo_censo_dm_Services.py
"""
from datos.bd_ciae.extractor_Datos import leer_partes
from datos.lectura_mapeo.mapeo_por_modulo_Datos import cargar_indicador_extractor
from services.censo_dm.denominador_censo_dm_Services import MES_QUE_USA_CENSO_DEL_ANIO
from services.extractor.catalogo_extractor_Services import indicadores_extractor, usa_censo_dm
from services.extractor.mes_anualizado_censo_Services import generar_mes_anualizado_censo
from shared.MESES import MESES_ESTANDAR


def recalcular_con_censo_dm(anio_censo: int) -> list[str]:
    """Los meses que quedaron generados con este censo, ej. ["DM 05 Diciembre 2025", "DM 05 Enero 2026"]."""

    meses_del_censo = [(MES_QUE_USA_CENSO_DEL_ANIO, anio_censo)] + [
        (mes, anio_censo + 1) for mes in MESES_ESTANDAR if mes != MES_QUE_USA_CENSO_DEL_ANIO
    ]
    generados = []

    for indicador in indicadores_extractor():
        mapeo = cargar_indicador_extractor(indicador)
        if not usa_censo_dm(mapeo):
            continue

        # Las ventanas de esos meses van de enero del año del censo a noviembre del siguiente.
        partes_por_anio = {anio: leer_partes(indicador, anio) for anio in (anio_censo - 1, anio_censo, anio_censo + 1)}

        for mes, anio in meses_del_censo:
            resultado, _ = generar_mes_anualizado_censo(indicador, mapeo, anio, mes, partes_por_anio)
            if resultado:
                generados.append(f"{indicador} {mes} {anio}")

    return generados
