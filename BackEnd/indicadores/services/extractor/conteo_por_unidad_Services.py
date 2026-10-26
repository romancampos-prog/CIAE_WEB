"""
Conteo de filas por unidad del Excel del Extractor: por el mes del archivo (lo normal) o por el
mes del reporte de SU NACIMIENTO (sobrevida, Neonatal 04).
Usado en: services/extractor/generar_*_Services.py, services/extractor/subir_archivo_extractor_Services.py
"""
import pandas as pd

from datos.excel_subido.lector_excel_Datos import LectorExcel
from services.extractor.leer_archivo_extractor_Services import filas_que_cuentan, leer_fecha
from shared.MESES import MESES_ESTANDAR


def contar_por_unidad(lector: LectorExcel, config: dict, anio: int, mes_nombre: str) -> dict[str, int]:
    """{unidad: filas que cuentan}; toda unidad del catalogo aparece, en 0 si no tuvo casos."""
    filas, catalogo = filas_que_cuentan(lector, config, anio, mes_nombre)
    conteo = filas["unidad"].value_counts()
    return {nombre: int(conteo.get(nombre, 0)) for nombre in catalogo.values()}


##--------------------------------------

def contar_por_unidad_y_mes_de_nacimiento(lector: LectorExcel, config: dict, anio: int, mes_nombre: str) -> dict[tuple[int, str], dict[str, int]]:
    """
    Para indicadores de sobrevida (Neonatal 04): cada defuncion se cuenta en el mes del reporte
    de SU NACIMIENTO, no en el mes del archivo. Reglas de config["mesDelReporte"]:
      - periodo de nacimiento con corte de SIMOC: del dia 'diaDeCorte' en adelante es del mes siguiente
      - mes del reporte = periodo + 'desfaseMeses'
      - solo cuenta si murio antes de 'edadMaximaDias' de vida
    Regresa {(año, mes del reporte): {unidad: defunciones}}.
    """

    regla = config["mesDelReporte"]
    filas, catalogo = filas_que_cuentan(lector, config, anio, mes_nombre)

    nacimiento = leer_fecha(filas[regla["columnaFechaNacimiento"]])
    defuncion  = leer_fecha(filas[regla["columnaFechaDefuncion"]])
    dias_de_vida = (defuncion - nacimiento).dt.days

    conteo: dict[tuple[int, str], dict[str, int]] = {}

    for indice in filas.index:
        if pd.isna(dias_de_vida[indice]) or dias_de_vida[indice] >= regla["edadMaximaDias"]:
            continue

        fecha = nacimiento[indice]
        meses_a_sumar = regla["desfaseMeses"] + (1 if fecha.day >= regla["diaDeCorte"] else 0)
        posicion = fecha.month - 1 + meses_a_sumar
        mes_del_reporte = (fecha.year + posicion // 12, MESES_ESTANDAR[posicion % 12])
        por_unidad = conteo.setdefault(mes_del_reporte, {nombre: 0 for nombre in catalogo.values()})
        por_unidad[filas.at[indice, "unidad"]] += 1

    return conteo
