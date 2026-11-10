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

# Fondo y letra de una celda segun su nivel (el "nivel" del catalogo de estatus)
COLOR_NIVEL = {
    "Bajo":     ("#FDE2E2", "#991B1B"),
    "Medio":    ("#FEF0C7", "#92400E"),
    "Esperado": ("#D1F2E0", "#065F46"),
}

ALTO_FILA = 22
ALTO_AVISO = 34
ANCHO_MINIMO = 10
ANCHO_MAXIMO = 60


def libro_excel_extraccion(hojas: list[tuple[str, list[str], list[dict]]], niveles_por_columna: dict[str, dict[str, str]] | None = None, columnas_izquierda: list[str] | None = None, aviso: str | None = None) -> bytes:
    """
    @param hojas - (nombre, columnas en orden, filas {columna: valor}) de cada hoja; la fecha ya llega como date
    @param niveles_por_columna - {columna: {valor: nivel}}: esas celdas van del color de su nivel (COLOR_NIVEL)
    @param columnas_izquierda - las columnas de texto pegadas a la izquierda; las demas van centradas
    @param aviso - texto en la primera fila de la primera hoja, arriba del encabezado
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
        "centrado": libro.add_format({**base, "align": "center"}),
        "numero": libro.add_format({**base, "align": "center", "num_format": "#,##0"}),
        "fecha": libro.add_format({**base, "num_format": "dd/mm/yyyy", "align": "center"}),
        "rayado": libro.add_format({"bg_color": GUINDA_TINTE}),
        "aviso": libro.add_format({"font_name": "Calibri", "font_size": 10, "bold": True, "font_color": GUINDA, "bg_color": GUINDA_TINTE, "text_wrap": True, "valign": "vcenter", "border": 1, "border_color": BORDE}),
        **{nivel: libro.add_format({"bg_color": fondo, "font_color": letra, "bold": True}) for nivel, (fondo, letra) in COLOR_NIVEL.items()},
    }

    for posicion, (nombre, columnas, filas) in enumerate(hojas):
        _escribir_hoja(libro.add_worksheet(nombre[:31]), columnas, filas, formatos, niveles_por_columna or {}, columnas_izquierda or [], aviso if posicion == 0 else None)

    libro.close()
    return salida.getvalue()


##--------------------------------------

def _escribir_hoja(hoja, columnas: list[str], filas: list[dict], formatos: dict, niveles_por_columna: dict[str, dict[str, str]], columnas_izquierda: list[str], aviso: str | None) -> None:

    # 1- El aviso, si hay, y el encabezado (mas alto que las demas filas)
    hoja.set_default_row(ALTO_FILA)
    fila_encabezado = 0
    if aviso:
        hoja.set_row(0, ALTO_AVISO)
        hoja.merge_range(0, 0, 0, len(columnas) - 1, aviso, formatos["aviso"])
        fila_encabezado = 1

    hoja.set_row(fila_encabezado, 30)
    for col, columna in enumerate(columnas):
        hoja.write_string(fila_encabezado, col, columna, formatos["encabezado"])

    # 2- Registros (texto, salvo fechas y conteos: el NSS no debe perder ceros ni volverse numero)
    for fila_excel, fila in enumerate(filas, start=fila_encabezado + 1):
        for col, columna in enumerate(columnas):
            valor = fila.get(columna)
            formato_texto = formatos["texto" if columna in columnas_izquierda else "centrado"]
            if isinstance(valor, date):
                hoja.write_datetime(fila_excel, col, valor, formatos["fecha"])
            elif isinstance(valor, int) and not isinstance(valor, bool):
                hoja.write_number(fila_excel, col, valor, formatos["numero"])
            elif valor in (None, ""):
                hoja.write_blank(fila_excel, col, None, formato_texto)
            else:
                hoja.write_string(fila_excel, col, str(valor), formato_texto)

    primera_fila = fila_encabezado + 1
    ultima_fila = fila_encabezado + len(filas)
    ultima_col = len(columnas) - 1

    # 3- Ancho de cada columna segun su texto mas largo
    for col, columna in enumerate(columnas):
        largos = [len(columna)] + [len(_como_texto(fila.get(columna))) for fila in filas]
        hoja.set_column(col, col, min(max(max(largos) + 2, ANCHO_MINIMO), ANCHO_MAXIMO))

    # 4- Primera fila inmovil y filtro en cada columna
    hoja.freeze_panes(primera_fila, 0)
    hoja.autofilter(fila_encabezado, 0, ultima_fila, ultima_col)

    # 5- Color por nivel y rayado tenue (formato condicional: se respeta al ordenar o filtrar).
    #    El color va primero: en Excel gana la regla que se agrego antes
    if filas:
        for col, columna in enumerate(columnas):
            for valor, nivel in niveles_por_columna.get(columna, {}).items():
                hoja.conditional_format(primera_fila, col, ultima_fila, col, {"type": "cell", "criteria": "==", "value": f'"{valor}"', "format": formatos[nivel], "stop_if_true": True})

        hoja.conditional_format(primera_fila, 0, ultima_fila, ultima_col, {"type": "formula", "criteria": "=MOD(ROW(),2)=0", "format": formatos["rayado"]})

    # 6- Para imprimir: horizontal, a lo ancho de la hoja y con el encabezado en cada pagina
    hoja.set_landscape()
    hoja.fit_to_pages(1, 0)
    hoja.repeat_rows(fila_encabezado)


##--------------------------------------

def _como_texto(valor) -> str:
    if isinstance(valor, date):
        return "00/00/0000"
    return "" if valor is None else str(valor)
