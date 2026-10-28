"""
Sacar datos de un Excel ya cargado en un DataFrame (columnas por letra), segun el modoExtraccion
del mapeo. motor_extraccion_Services.extraer es la puerta de entrada: valida el detalle con su
modelo (detalle_extraccion_Model) y llama al modo, cada uno en su propio archivo:
  - modos_por_posicion/: INTERSECCION_COLUMNA, INTERSECCION_FILA, ULTIMA_FILA
  - modos_por_filtro/:   FILTRO_CONTEO, FILTRO_UNIDAD_VALOR y las reglas de filtro que usan
    (cumple_condicion, fila_cumple, mascara_filtros, coincide_unidad)
"""
