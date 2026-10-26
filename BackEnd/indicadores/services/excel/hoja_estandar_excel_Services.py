"""
El libro estandar (FTP y Extractor): prepara lo leido de cada hoja (historico, poblacion por
mes y el mensual acumulado) y se lo pasa al dibujante.
Usado en: services/excel/generar_excel_Services.py
"""
import io

import xlsxwriter

from schemas.model.excel_Model import HojaIndicador
from schemas.model.reporte_guardado_Model import UnidadDatos
from services.compartido.calculo.mensual_acumulado_Services import acumula_sumando_meses, calcular_mensual_acumulado
from services.excel.escribir_hoja_indicador_Services import escribir_hoja_indicador
from services.excel.estilos_excel_Services import obtener_estilos_excel
from shared.MESES import MESES_ESTANDAR


def _a_formato_excel(unidades: dict[str, UnidadDatos]) -> dict[str, dict]:
    # El escritor (escribir_hoja_indicador) lee "resultado" y "color", no "%" y "desempeno".
    return {
        unidad: {
            "numerador":   datos.numerador,
            "denominador": datos.denominador,
            "resultado":   datos.resultado,
            "color":       datos.desempeno,
        }
        for unidad, datos in unidades.items()
    }


##--------------------------------------

def _dibujar_estandar(libro: xlsxwriter.Workbook, estilos: dict, hoja: HojaIndicador) -> None:
    historicos: dict[str, dict[int, dict]] = {}
    # Poblacion usada en CADA mes que aparece en la hoja (no solo el mes activo) --
    # cada uno pudo haberse calculado con una poblacion distinta (regla de corte
    # hacia adelante), asi que cada columna de mes necesita su propia leyenda.
    poblacion_por_mes: dict[int, str | None] = {}

    for mes, mes_reporte in hoja.meses.items():
        poblacion_por_mes[MESES_ESTANDAR.index(mes)] = mes_reporte.Poblacion
        if mes == hoja.mesActivo:
            continue
        for unidad, valores in _a_formato_excel(mes_reporte.Reporte).items():
            historicos.setdefault(unidad, {})[MESES_ESTANDAR.index(mes)] = valores

    # Mensual + mensual acumulado en el mapeo: bloque acumulado debajo, sumando los
    # meses guardados hasta el mes activo (mismo calculo que la grafica). El semanal no aplica.
    acumulado_por_mes = None

    if hoja.semana is None and acumula_sumando_meses(hoja.indicador):
        hasta = MESES_ESTANDAR.index(hoja.mesActivo)
        acumulado = calcular_mensual_acumulado({m: r for m, r in hoja.meses.items() if MESES_ESTANDAR.index(m) <= hasta}, hoja.indicador) or {}
        acumulado_por_mes = {MESES_ESTANDAR.index(m): _a_formato_excel(r.Reporte) for m, r in acumulado.items()}

    metadata = hoja.metadata
    escribir_hoja_indicador(
        libro, estilos, hoja.indicador,
        _a_formato_excel(hoja.meses[hoja.mesActivo].Reporte),
        {
            "titulo":       metadata.titulo,
            "desNum":       metadata.descripcionNumerador,
            "desDen":       metadata.descripcionDenominador,
            "arch":         metadata.nombreArchivo,
            "semaforo":     metadata.semaforo,
            "periodicidad": metadata.periodicidad,
        },
        str(hoja.ano), str(MESES_ESTANDAR.index(hoja.mesActivo) + 1).zfill(2),
        hoja.semana, hoja.semana is not None,
        historicos, poblacion_por_mes,
        acumulado_por_mes,
    )


##--------------------------------------

def armar_excel_estandar(hojas: list[HojaIndicador]) -> bytes:
    salida = io.BytesIO()
    libro = xlsxwriter.Workbook(salida)
    libro.set_properties({"author": "Web CIAE"})
    estilos = obtener_estilos_excel(libro)

    for hoja in hojas:
        _dibujar_estandar(libro, estilos, hoja)

    libro.close()

    return salida.getvalue()
