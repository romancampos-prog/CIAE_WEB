"""
Estilos (formatos de xlsxwriter) del libro estandar de FTP y Extractor.
Usado en: services/excel/hoja_estandar_excel_Services.py, services/excel/escribir_hoja_indicador_Services.py
"""


def estilo_valor(fmt, clave_base, valor):
    """Formato de una celda de numerador/denominador dentro de una fila Gris.
    Si el valor sí existe (no None/""), usa la variante gris RGB(49,134,155)
    bold del mismo formato base -- mismo fondo/borde, solo marca que no se
    contó en el total."""
    if valor not in (None, ""):
        return fmt.get(f"{clave_base}_incompleto", fmt[clave_base])
    return fmt[clave_base]


##--------------------------------------

def obtener_estilos_excel(workbook):
    C_VERDE       = '#0B5445'
    C_DORADO      = '#9A7026'
    C_ROJO        = "#7E0808"
    C_GRIS_FONDOS = '#F2F2F2'
    C_GRIS_TOTAL  = '#808080'
    C_BORDE       = '#D1D1D1'

    base = {
        'font_name': 'Calibri', 'font_size': 11, 'valign': 'vcenter',
        'border': 1, 'border_color': C_BORDE, 'align': 'center'
    }

    return {
        'titulo_izq':            workbook.add_format({**base, 'bold': True, 'font_size': 16, 'font_color': C_VERDE, 'border': 0, 'align': 'left'}),
        'nota_completas':        workbook.add_format({'font_name': 'Calibri', 'font_size': 14, 'bold': True, 'align': 'center'}),
        'etiqueta_bold':         workbook.add_format({**base, 'bold': True, 'bg_color': C_GRIS_FONDOS, 'align': 'left'}),
        'descripcion':           workbook.add_format({**base, 'text_wrap': True, 'font_color': '#444444', 'align': 'left'}),
        'columna_unidad_header': workbook.add_format({**base, 'bold': True, 'bg_color': C_GRIS_FONDOS}),
        'columna_unidad_dato':   workbook.add_format({**base, 'bg_color': C_GRIS_FONDOS}),
        'subtitulo':             workbook.add_format({**base, 'bold': True, 'bg_color': C_GRIS_FONDOS, 'font_color': '#444444'}),
        'header_sub':            workbook.add_format({**base, 'bold': True, 'bg_color': C_GRIS_FONDOS, 'font_size': 9}),
        'Esperado_Leyenda':      workbook.add_format({**base, 'bg_color': C_GRIS_FONDOS, 'font_color': C_VERDE,  'bold': True}),
        'Medio_Leyenda':         workbook.add_format({**base, 'bg_color': C_GRIS_FONDOS, 'font_color': C_DORADO, 'bold': True}),
        'Bajo_Leyenda':          workbook.add_format({**base, 'bg_color': C_GRIS_FONDOS, 'font_color': C_ROJO,   'bold': True}),
        'dato_normal':           workbook.add_format({**base, 'num_format': '#,##0'}),
        'fila_par':              workbook.add_format({**base, 'bg_color': '#F9F9F9', 'num_format': '#,##0'}),
        # Idénticos a dato_normal/fila_par -- solo cambia font_color a gris
        # RGB(49,134,155) bold: un numerador o denominador que sí existe en una
        # fila Gris, pero que no se contó en el total (mismo criterio que IAAS).
        'dato_normal_incompleto': workbook.add_format({**base, 'num_format': '#,##0', 'font_color': '#31869B', 'bold': True}),
        'fila_par_incompleto':    workbook.add_format({**base, 'bg_color': '#F9F9F9', 'num_format': '#,##0', 'font_color': '#31869B', 'bold': True}),
        'total_gris_80':         workbook.add_format({**base, 'bold': True, 'bg_color': C_GRIS_TOTAL, 'font_color': 'white', 'num_format': '#,##0'}),
        'Esperado_Capsula':      workbook.add_format({**base, 'bg_color': C_VERDE,   'font_color': 'white', 'bold': True, 'num_format': '0.00'}),
        'Medio_Capsula':         workbook.add_format({**base, 'bg_color': C_DORADO,  'font_color': 'white', 'bold': True, 'num_format': '0.00'}),
        'Bajo_Capsula':          workbook.add_format({**base, 'bg_color': C_ROJO,    'font_color': 'white', 'bold': True, 'num_format': '0.00'}),
        'Gris_Capsula':          workbook.add_format({**base, 'bg_color': '#CCCCCC', 'font_color': 'black', 'bold': True, 'num_format': '0.00'}),
        'poblacion_leyenda':     workbook.add_format({'font_name': 'Calibri', 'font_size': 9, 'italic': True, 'font_color': '#888888', 'align': 'left', 'border': 0}),
        # Barra que separa el bloque "MENSUAL ACUMULADO" (igual idea que la barra de IAAS).
        'titulo_seccion':        workbook.add_format({**base, 'bold': True, 'font_size': 12, 'bg_color': C_VERDE, 'font_color': 'white', 'align': 'left'}),
    }
