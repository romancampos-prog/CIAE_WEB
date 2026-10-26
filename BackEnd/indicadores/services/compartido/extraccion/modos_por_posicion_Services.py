"""
Modos de extraccion por posicion (los de FTP): INTERSECCION_COLUMNA (fila por etiqueta),
INTERSECCION_FILA (fila fija) y ULTIMA_FILA (el ultimo valor numerico de la columna).
Usado en: services/compartido/extraccion/motor_extraccion_Services.py
"""
import pandas as pd

from schemas.model.detalle_extraccion_Model import DetalleInterseccionColumna, DetalleInterseccionFila, DetalleUltimaFila
from services.compartido.extraccion.valores_celda_Services import a_numero
from shared.columnas_excel import letra_a_numero


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


##--------------------------------------

def interseccion_fila(df, detalle: DetalleInterseccionFila):
    valores = []

    for f in detalle.fila:
        idx_fila = f - 1

        for letra in detalle.columna_dato:
            idx_col = letra_a_numero(letra)

            try:
                valores.append(a_numero(df.iloc[idx_fila, idx_col]) or 0.0)
            except IndexError:
                valores.append(None)

    if not valores or all(v is None for v in valores):
        return None, "ARCHIVO_VACIO", f"Filas {detalle.fila} vacias o no encontradas"
    if any(v is None for v in valores):
        return valores, "VALOR_NULO", None

    return valores, None, None


##--------------------------------------

def ultima_fila(df, detalle: DetalleUltimaFila):
    indices = [letra_a_numero(l) for l in detalle.columna_dato]
    bloque  = df.iloc[detalle.encabezado:, indices]

    valores = []

    for i in range(bloque.shape[1]):
        columna = pd.to_numeric(bloque.iloc[:, i], errors='coerce').dropna()
        valores.append(float(columna.iloc[-1]) if not columna.empty else None)

    if all(v is None for v in valores):
        return None, "ARCHIVO_VACIO", f"Sin valores numericos en {detalle.columna_dato} desde fila {detalle.encabezado + 1}"
    if any(v is None for v in valores):
        return valores, "VALOR_NULO", None

    return valores, None, None
