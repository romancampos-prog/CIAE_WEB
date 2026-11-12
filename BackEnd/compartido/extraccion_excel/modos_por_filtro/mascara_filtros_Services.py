"""
Que filas pasan TODOS los filtros de un DetalleFiltroConteo (filtroColumna, filtroGrupoColumnas
y filtroAlternativas), como una serie True/False.
Usado en: indicadores/services/extractor/leer_archivo_extractor_Services.py, modos_por_filtro/filtro_conteo_Services.py
"""
import pandas as pd

from compartido.extraccion_excel.columnas_excel import letra_a_numero
from compartido.extraccion_excel.detalle_extraccion_Model import CondicionFiltro, DetalleFiltroConteo
from compartido.extraccion_excel.modos_por_filtro.cumple_condicion_Services import cumple_condicion


def _columna_cumple(df, letra: str, cfg: CondicionFiltro) -> pd.Series:
    idx = letra_a_numero(letra)
    if idx >= df.shape[1]:
        raise KeyError(f"La columna {letra} no existe en la hoja")
    return df.iloc[:, idx].map(lambda v, c=cfg: cumple_condicion(v, c)).astype(bool)


##--------------------------------------

def mascara_filtros(df, detalle: DetalleFiltroConteo) -> pd.Series:
    """
    Que filas pasan TODOS los filtros del detalle (filtroColumna y filtroGrupoColumnas).
    Es la regla unica de "esta fila cuenta": la usan el conteo total (filtro_conteo)
    y el conteo por unidad del Extractor. KeyError si una columna no existe en la hoja.
    """
    mascara = pd.Series(True, index=df.index)

    for letra, cfg in detalle.filtroColumna.items():
        mascara &= _columna_cumple(df, letra, cfg)

    for grupo in detalle.filtroGrupoColumnas:
        condicion = grupo.condicion()
        alguna = pd.concat([_columna_cumple(df, letra, condicion) for letra in grupo.columnas], axis=1).any(axis=1)
        mascara &= alguna if grupo.coincidencia == 'CUALQUIERA' else ~alguna

    if detalle.filtroAlternativas:
        cumple_alguna = pd.Series(False, index=df.index)

        for alternativa in detalle.filtroAlternativas:
            cumple_esta = pd.Series(True, index=df.index)
            for letra, cfg in alternativa.items():
                cumple_esta &= _columna_cumple(df, letra, cfg)
            cumple_alguna |= cumple_esta

        mascara &= cumple_alguna

    return mascara
