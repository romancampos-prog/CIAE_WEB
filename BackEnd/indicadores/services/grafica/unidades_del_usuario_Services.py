"""
Usuario de unidad (rol "unidad"): de lo guardado solo se deja su unidad, sin las demas ni el
TOTAL_OOAD. Se filtra antes de calcular estadisticas y perfil, asi tampoco se cuelan ahi.
Usado en: services/grafica/grafica_indicador_Services.py
"""
from schemas.model.reporte_guardado_Model import MesReporte, ReporteIndicador


def _meses_solo_de_unidades(meses: dict[str, MesReporte], unidades: list[str]) -> dict[str, MesReporte]:
    """Cada mes (o corte) con solo las unidades del usuario."""

    return {
        mes: MesReporte(Poblacion=contenido.Poblacion, Reporte={u: d for u, d in contenido.Reporte.items() if u in unidades})
        for mes, contenido in meses.items()
    }


##--------------------------------------

def reporte_solo_de_unidades(reporte: ReporteIndicador, unidades: list[str]) -> ReporteIndicador:
    """MESES, semanal y mensual acumulado con solo las unidades del usuario."""

    reporte.MESES = _meses_solo_de_unidades(reporte.MESES, unidades)

    if reporte.SEMANA:
        reporte.SEMANA.MES = _meses_solo_de_unidades(reporte.SEMANA.MES, unidades)

    if reporte.MENSUAL_ACUMULADO:
        reporte.MENSUAL_ACUMULADO = _meses_solo_de_unidades(reporte.MENSUAL_ACUMULADO, unidades)

    return reporte


##--------------------------------------

def serie_cortes_solo_de_unidades(serie: dict, unidades: list[str]) -> dict:
    """La serie de cortes del Extractor (cortes y casos por mes) con solo las unidades del usuario."""

    for punto in serie["cortes"] + serie["casosPorMes"]:
        punto["unidades"] = {u: d for u, d in punto["unidades"].items() if u in unidades}

    return serie
