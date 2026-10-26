"""
La grafica completa de un indicador: ficha + reporte del año (con las reglas de cada modulo) +
estadisticas + perfil.
Usado en: Controller/reportes_Controller.py
"""
from datos.lectura_mapeo.mapeo_indicadores_Datos import bloque_mapeo
from schemas.model.reporte_guardado_Model import MesReporte
from services.compartido.calculo.mensual_acumulado_Services import acumula_sumando_meses, calcular_mensual_acumulado
from services.compartido.reporte_guardado_Services import cargar_reporte_indicador, cargar_semanal
from services.extractor.catalogo_extractor_Services import indicadores_extractor_de_corte
from services.grafica.estadisticas_grafica_Services import estadisticas_de_reporte
from services.grafica.perfil_indicador_Services import perfil_de_indicador
from services.grafica.serie_cortes_Services import serie_de_cortes
from services.informacion.ficha_indicador_Services import obtener_ficha_indicador
from shared.MESES import MESES_ESTANDAR
from shared.UNIDADES import nombre_canonico_iaas


def consultar_grafica_indicador(indicador: str, ano: str) -> dict | None:
    """
    Ficha + reporte + estadisticas + perfil de un indicador para las graficas. El modulo sale del
    mapeo (la carpeta del indicador), no de lo que mande el front. None si no existe en el mapeo.
    """

    # 1. Leer el mapeo y el reporte guardado del año
    bloque = bloque_mapeo(indicador)

    if bloque is None:
        return None

    modulo = bloque["modulo"]
    cargado = cargar_reporte_indicador(indicador, ano)
    reporte = cargado[0] if cargado else None

    if reporte is not None:
        # 2. IAAS: el dato guardado a veces trae el alias HGSZ de una unidad HGS -- se unifica al
        #    nombre del catalogo para que la unidad no aparezca duplicada ni "sin datos".
        if modulo == "iaas":
            reporte.MESES = {
                mes: MesReporte(Poblacion=contenido.Poblacion, Reporte={nombre_canonico_iaas(u): d for u, d in contenido.Reporte.items()})
                for mes, contenido in reporte.MESES.items()
            }

        # 3. FTP: el semanal se muestra si es del mes siguiente al ultimo definitivo
        semanal = cargar_semanal(indicador, ano) if modulo == "ftp" else None

        if semanal:
            ultimo_mes = MESES_ESTANDAR.index(list(reporte.MESES)[-1]) + 1
            mes_semanal = MESES_ESTANDAR.index(list(semanal.MES)[-1]) + 1
            if ultimo_mes + 2 > mes_semanal > ultimo_mes:
                reporte.SEMANA = semanal

        # 4. Mensual + mensual acumulado en el mapeo: el acumulado se arma sumando meses
        if acumula_sumando_meses(indicador):
            reporte.MENSUAL_ACUMULADO = calcular_mensual_acumulado(reporte.MESES, indicador) or None

        # 5. Extractor de corte: MESES trae el numerador crudo; la grafica muestra solo el
        #    ultimo corte cerrado (CORTES.MESES), el ultimo resultado oficial.
        elif modulo == "extractor" and indicador in indicadores_extractor_de_corte():
            cortes = cargado[1]
            ultimo_corte = max(cortes, key=MESES_ESTANDAR.index) if cortes else None
            reporte.MESES = {ultimo_corte: cortes[ultimo_corte]} if ultimo_corte else {}

    # 6. Perfil: lo que la grafica necesita saber del indicador (meta, niveles, unidad de medida...)
    unidades = []

    for contenido in (reporte.MESES.values() if reporte else []):
        unidades += [u for u in contenido.Reporte if u not in unidades]

    perfil = perfil_de_indicador(bloque, unidades)

    if modulo == "extractor" and indicador in indicadores_extractor_de_corte():
        perfil["serieCortes"] = serie_de_cortes(indicador, ano)

    # 7. Juntar ficha, reporte, estadisticas y perfil
    return {
        "ficha": obtener_ficha_indicador(indicador),
        "reporte": reporte,
        "estadisticas": estadisticas_de_reporte(reporte, bloque),
        "perfil": perfil,
    }
