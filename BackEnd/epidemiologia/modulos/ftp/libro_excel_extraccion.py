"""
El libro de Excel de una extraccion del FTP (ej. Acciones OC30): una hoja por tabla (los registros y,
aparte, lo que significa cada clave), todas con el mismo diseño: encabezado guinda en la primera fila
(inmovil), filtro en cada columna y rayado tenue. La fecha va como fecha real de Excel para que su
filtro agrupe por año/mes/dia.
Usado en: services/ftp/excel_extraccion_Services.py
"""
import io
from datetime import date

import xlsxwriter

GUINDA       = "#691C32"
GUINDA_TINTE = "#F8EEF1"
BORDE        = "#E3D3D8"

ANCHO_MINIMO = 10
ANCHO_MAXIMO = 60


def libro_excel_extraccion(hojas: list[tuple[str, list[str], list[dict]]]) -> bytes:
    """
    @param hojas - (nombre, columnas en orden, filas {columna: valor}) de cada hoja; la fecha ya llega como date
    @returns los bytes del .xlsx
    """

    salida = io.BytesIO()
    libro = xlsxwriter.Workbook(salida, {"in_memory": True})

    base = {"font_name": "Calibri", "font_size": 10, "valign": "vcenter", "border": 1, "border_color": BORDE}
    formatos = {
        "encabezado": libro.add_format({
            **base, "bold": True, "font_size": 11, "font_color": "#FFFFFF", "bg_color": GUINDA,
            "align": "center", "text_wrap": True, "border_color": GUINDA,
        }),
        "texto": libro.add_format(base),
        "numero": libro.add_format({**base, "align": "center", "num_format": "#,##0"}),
        "fecha": libro.add_format({**base, "num_format": "dd/mm/yyyy", "align": "center"}),
        "rayado": libro.add_format({"bg_color": GUINDA_TINTE}),
    }

    for nombre, columnas, filas in hojas:
        _escribir_hoja(libro.add_worksheet(nombre[:31]), columnas, filas, formatos)

    libro.close()
    return salida.getvalue()


##--------------------------------------

def _escribir_hoja(hoja, columnas: list[str], filas: list[dict], formatos: dict) -> None:

    # 1- Encabezado
    hoja.set_row(0, 30)
    for col, columna in enumerate(columnas):
        hoja.write_string(0, col, columna, formatos["encabezado"])

    # 2- Registros (texto, salvo fechas y conteos: el NSS no debe perder ceros ni volverse numero)
    for fila_excel, fila in enumerate(filas, start=1):
        for col, columna in enumerate(columnas):
            valor = fila.get(columna)
            if isinstance(valor, date):
                hoja.write_datetime(fila_excel, col, valor, formatos["fecha"])
            elif isinstance(valor, int) and not isinstance(valor, bool):
                hoja.write_number(fila_excel, col, valor, formatos["numero"])
            elif valor in (None, ""):
                hoja.write_blank(fila_excel, col, None, formatos["texto"])
            else:
                hoja.write_string(fila_excel, col, str(valor), formatos["texto"])

    ultima_fila = len(filas)
    ultima_col = len(columnas) - 1

    # 3- Ancho de cada columna segun su texto mas largo
    for col, columna in enumerate(columnas):
        largos = [len(columna)] + [len(_como_texto(fila.get(columna))) for fila in filas]
        hoja.set_column(col, col, min(max(max(largos) + 2, ANCHO_MINIMO), ANCHO_MAXIMO))

    # 4- Primera fila inmovil y filtro en cada columna
    hoja.freeze_panes(1, 0)
    hoja.autofilter(0, 0, ultima_fila, ultima_col)

    # 5- Rayado tenue (formato condicional: se respeta al ordenar o filtrar)
    if ultima_fila:
        hoja.conditional_format(1, 0, ultima_fila, ultima_col, {"type": "formula", "criteria": "=MOD(ROW(),2)=0", "format": formatos["rayado"]})

    # 6- Para imprimir: horizontal, a lo ancho de la hoja y con el encabezado en cada pagina
    hoja.set_landscape()
    hoja.fit_to_pages(1, 0)
    hoja.repeat_rows(0)


##--------------------------------------

def _como_texto(valor) -> str:
    if isinstance(valor, date):
        return "00/00/0000"
    return "" if valor is None else str(valor)
