"""
Excel de IAAS (matriz por mes + mensual acumulado + anual): dibuja las hojas vacias y las llena
con lo guardado.
Usado en: services/excel/generar_excel_Services.py
"""
import io

import xlsxwriter

from services.excel.excel_iaas_calculo_Services import fila_acumulada, fila_mensual, leer_meses_guardados
from services.excel.excel_iaas_dibujo_Services import (
    dibujar_hoja_iaas01, dibujar_hoja_iaas_uci, escribir_valores_iaas, estilos_excel_iaas,
)
from services.iaas.catalogo_iaas_Services import INDICADORES_IAAS


def excel_iaas(anio: str, indicadores: list[str]) -> bytes:
    """Un solo indicador -> su hoja; varios -> el libro completo de los 6."""

    salida = io.BytesIO()
    libro  = xlsxwriter.Workbook(salida)
    libro.set_properties({'author': 'Web CIAE'})
    estilos = estilos_excel_iaas(libro)

    # 1. Dibujar las hojas vacias
    hojas = indicadores if len(indicadores) == 1 else INDICADORES_IAAS
    filas = {ind: dibujar_hoja_iaas01(libro, estilos) if ind == "IAAS 01" else dibujar_hoja_iaas_uci(libro, estilos, ind) for ind in hojas}

    # 2. Llenar cada hoja con lo guardado: cada mes, su acumulado desde enero y el anual
    for indicador in hojas:
        hoja = libro.get_worksheet_by_name(indicador)
        cols_mes, primera_col = (4, 2) if indicador == "IAAS 01" else (3, 1)   # IAAS 01 deja vacia la columna de egresos
        meses = leer_meses_guardados(anio, indicador)

        for numero_mes, datos in meses.items():
            col = primera_col + (numero_mes - 1) * cols_mes
            escribir_valores_iaas(hoja, estilos, fila_mensual(datos, indicador), filas[indicador]["mensual"], col)

        for numero_mes in range(2, 13):   # el acumulado empieza en febrero
            if numero_mes in meses:
                col = primera_col + (numero_mes - 2) * cols_mes
                escribir_valores_iaas(hoja, estilos, fila_acumulada(meses, indicador, numero_mes), filas[indicador]["acumulado"], col)

        if meses:
            escribir_valores_iaas(hoja, estilos, fila_acumulada(meses, indicador, max(meses)), filas[indicador]["anual"], primera_col)

    libro.close()

    return salida.getvalue()
