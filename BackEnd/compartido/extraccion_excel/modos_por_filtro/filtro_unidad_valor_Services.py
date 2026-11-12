"""
FILTRO_UNIDAD_VALOR: la fila de una unidad y el valor de otra columna de esa fila (IAAS).
Usado en: motor_extraccion_Services.py
"""
from compartido.extraccion_excel.columnas_excel import letra_a_numero
from compartido.extraccion_excel.detalle_extraccion_Model import DetalleFiltroUnidadValor
from compartido.extraccion_excel.modos_por_filtro.coincide_unidad_Services import coincide_unidad
from compartido.extraccion_excel.modos_por_filtro.cumple_condicion_Services import cumple_condicion
from compartido.extraccion_excel.modos_por_filtro.fila_cumple_Services import fila_cumple
from compartido.extraccion_excel.valores_celda_Services import a_numero


def filtro_unidad_valor(df, detalle: DetalleFiltroUnidadValor, nombre_unidad_buscada: str | None = None):
    """
    Ubica la fila de una unidad especifica y toma un valor de otra columna.
    "UNIDADES_IAAS" en columnaUnidad.filtro es un marcador especial (ver
    mapeo/README.md): en vez de comparar contra un valor fijo, compara contra
    nombre_unidad_buscada (la unidad que se esta pidiendo en esa llamada).
    """

    col_unidad_letra, cfg_unidad = next(iter(detalle.columnaUnidad.items()))
    idx_unidad = letra_a_numero(col_unidad_letra)
    col_valor_letra = next(iter(detalle.tomarValor))
    idx_valor  = letra_a_numero(col_valor_letra)

    for _, fila in df.iterrows():
        valor_unidad = fila.iloc[idx_unidad]

        if cfg_unidad.filtro == "UNIDADES_IAAS":
            if nombre_unidad_buscada is None or not coincide_unidad(valor_unidad, nombre_unidad_buscada):
                continue
        elif not cumple_condicion(valor_unidad, cfg_unidad):
            continue

        if detalle.filtroColumna and not fila_cumple(fila, detalle.filtroColumna):
            continue

        return a_numero(fila.iloc[idx_valor]), None, None

    return None, "ETIQUETA_NO_ENCONTRADA", f"Unidad no encontrada en columna {col_unidad_letra}"
