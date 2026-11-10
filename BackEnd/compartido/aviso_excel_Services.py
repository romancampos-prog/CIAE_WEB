"""
El aviso de uso que acompaña a cada Excel descargado de la plataforma: dice quien lo genero y
cuando, para saber de quien salio un archivo aunque ya circule fuera de la pagina.
Usado en: indicadores/services/excel/generar_excel_Services.py, epidemiologia/services/ftp/excel_extraccion_Services.py
"""
from datetime import datetime

_DATOS_PERSONALES = "Contiene datos personales y de salud confidenciales; no debe compartirse fuera de las funciones institucionales autorizadas. "


def texto_aviso_excel(usuario: str, con_datos_personales: bool) -> str:
    """
    @param usuario              - quien lo descarga (del token)
    @param con_datos_personales - True si el archivo trae pacientes; False si solo son totales por unidad
    """

    generado = f"Generado en CIAE el {datetime.now():%d/%m/%Y a las %H:%M} por {usuario}. "
    resguardo = "Quien lo descarga es responsable de su uso, resguardo y eliminación."

    return f"Documento de uso interno. {_DATOS_PERSONALES if con_datos_personales else ''}{generado}{resguardo}"


##--------------------------------------

def agregar_hoja_aviso(libro, texto: str) -> None:
    """Hoja "Aviso" al final del libro: no mueve las celdas de las hojas de datos."""

    hoja = libro.add_worksheet("Aviso")
    hoja.hide_gridlines(2)
    hoja.set_column(0, 0, 100)
    hoja.set_row(0, 60)
    hoja.write_string(0, 0, texto, libro.add_format({"font_name": "Calibri", "font_size": 11, "text_wrap": True, "valign": "vcenter"}))
