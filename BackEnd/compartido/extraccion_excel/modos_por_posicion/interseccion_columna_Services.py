"""
INTERSECCION_COLUMNA: busca en una columna la fila con un texto (ej. "TOTAL DE LA UNIDAD") y
toma de esa fila los valores de columna_dato (las letras pueden depender del mes).
Usado en: motor_extraccion_Services.py
"""
from compartido.extraccion_excel.columnas_excel import letra_a_numero
from compartido.extraccion_excel.detalle_extraccion_Model import DetalleInterseccionColumna
from compartido.extraccion_excel.valores_celda_Services import a_numero


# Modos "formula" -- mismo algoritmo que ya probo la extraccion de FTP, solo se
# renombran para que coincidan con el modoExtraccion real del mapeo (antes
# "INTERSECCION"/"FINAL", ahora "INTERSECCION_COLUMNA"/"ULTIMA_FILA").
def interseccion_columna(
    df, detalle: DetalleInterseccionColumna,
    mes: int | str | None = None,
    meses_dinamicos: dict[str, dict[str, str]] | None = None,
):
    """
    'meses_dinamicos' cubre marcadores tipo "MESES_CIP01" (ver CUPN 01 en
    indicadores/mapeo/CUPN.json): un elemento de columna_dato puede ser, en
    vez de una letra fija, el NOMBRE de una tabla lateral del mapeo que
    resuelve la columna real segun el mes del reporte (la misma columna del
    Excel trae acumulado distinto por mes). No es especifico de CIP01 --
    cualquier indicador puede declarar su propio marcador mientras lo pase
    aqui en meses_dinamicos={"NOMBRE_MARCADOR": {"1": "D", "2": "F", ...}}.
    """

    col_etiqueta = letra_a_numero(detalle.columna)
    texto_buscar = detalle.buscar
    letras_dato  = detalle.columna_dato

    serie = df.iloc[:, col_etiqueta].astype(str).str.replace(r'[\n\r]+', ' ', regex=True)
    filas = df[serie.str.contains(texto_buscar, na=False, case=False, regex=False)]

    if filas.empty:
        return None, "ETIQUETA_NO_ENCONTRADA", f"'{texto_buscar}' no encontrado en columna {detalle.columna}"

    fila = filas.iloc[0]
    valores = []

    for letra in letras_dato:
        if meses_dinamicos and letra in meses_dinamicos:
            if mes is None:
                return None, "VALOR_NULO", f"'{letra}' requiere el mes del reporte para resolver su columna"

            letra_real = meses_dinamicos[letra].get(str(int(mes)))

            if not letra_real:
                return None, "VALOR_NULO", f"Mes {mes} sin columna definida en '{letra}'"

            valores.append(a_numero(fila.iloc[letra_a_numero(letra_real)]))
        else:
            valores.append(a_numero(fila.iloc[letra_a_numero(letra)]))

    if all(v is None for v in valores):
        return None, "ARCHIVO_VACIO", f"Fila con '{texto_buscar}' encontrada pero celdas vacias en {letras_dato}"
    if any(v is None for v in valores):
        return valores, "VALOR_NULO", None

    return valores, None, None
