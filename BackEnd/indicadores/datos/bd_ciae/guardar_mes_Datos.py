"""
Guardado del mes definitivo de un indicador en BD_CIAE (FTP, IAAS, Extractor mensual y el
recalculo de poblacion).
Usado en: services/*, datos/bd_ciae/semanal_Datos.py (a_formato_de_disco)
"""
from collections.abc import Mapping

from datos.bd_ciae.archivos_bd_ciae_Datos import escribir_json, leer_json_para_actualizar, ruta_definitivo
from schemas.model.unidad_resultado_Model import ResultadoUnidad
from shared.MESES import nombre_del_mes


def a_formato_de_disco(unidades: Mapping[str, ResultadoUnidad]) -> dict[str, dict]:
    """En disco el resultado se llama "%" y el semaforo "desempeno"."""
    guardado: dict[str, dict] = {}

    for nombre, unidad in unidades.items():
        datos = unidad.model_dump()
        guardado[nombre] = {
            "numerador":   datos["numerador"],
            "denominador": datos["denominador"],
            "%":           datos["resultado"],
            **({"desempeno": datos["color"]} if "color" in datos else {}),
        }

    return guardado


##--------------------------------------

def guardar_mes_definitivo(
    indicador: str, ano: str, mes: str, unidades: Mapping[str, ResultadoUnidad], poblacion_usada: str | None = None,
) -> None:
    ruta = ruta_definitivo(indicador, ano)
    contenido = leer_json_para_actualizar(ruta, {"INDICADOR": indicador, "ANIO": ano, "MESES": {}})

    mes_nombre = nombre_del_mes(mes)

    if mes_nombre:
        contenido["MESES"][mes_nombre] = {"Poblacion": poblacion_usada, "Reporte": a_formato_de_disco(unidades)}

    escribir_json(ruta, contenido)
