"""
Si una fila cumple todas las condiciones de un filtroColumna.
Usado en: indicadores/services/extractor/conteo_con_cruce_Services.py, modos_por_filtro/filtro_unidad_valor_Services.py
"""
from service.extraccion_excel.columnas_excel import letra_a_numero
from service.extraccion_excel.detalle_extraccion_Model import CondicionFiltro
from service.extraccion_excel.modos_por_filtro.cumple_condicion_Services import cumple_condicion


def fila_cumple(fila, filtro_columna: dict[str, CondicionFiltro]) -> bool:
    for letra, cfg in filtro_columna.items():
        idx = letra_a_numero(letra)
        if idx >= len(fila) or not cumple_condicion(fila.iloc[idx], cfg):
            return False

    return True
