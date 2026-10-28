"""
FILTRO_CONTEO (y FILTRO_CONTEO_ACUMULADO): cuantas filas cumplen los filtros.
Usado en: motor_extraccion_Services.py
"""
from compartido.extraccion_excel.detalle_extraccion_Model import DetalleFiltroConteo
from compartido.extraccion_excel.modos_por_filtro.mascara_filtros_Services import mascara_filtros


def filtro_conteo(df, detalle: DetalleFiltroConteo):
    try:
        mascara = mascara_filtros(df, detalle)
    except KeyError as e:
        return None, "COLUMNA_NO_ENCONTRADA", str(e)

    return int(mascara.sum()), None, None
