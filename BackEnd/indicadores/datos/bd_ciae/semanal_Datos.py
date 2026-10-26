"""
El reporte semanal (previo) de FTP en BD_CIAE: guardar, leer y borrar el mes cuando ya llego
el definitivo.
Usado en: services/ftp/generar_indicador_ftp_Services.py, services/compartido/reporte_guardado_Services.py
"""
from collections.abc import Mapping

from datos.bd_ciae.archivos_bd_ciae_Datos import escribir_json, leer_json, leer_json_para_actualizar, ruta_semanal
from datos.bd_ciae.guardar_mes_Datos import a_formato_de_disco
from schemas.model.unidad_resultado_Model import ResultadoUnidad
from shared.MESES import nombre_del_mes


def leer_semanal_indicador(indicador: str, ano: str) -> dict:
    return leer_json(ruta_semanal(indicador, ano))


##--------------------------------------

def guardar_mes_semanal(
    indicador: str, ano: str, mes: str, semana: int | str, unidades: Mapping[str, ResultadoUnidad], poblacion_usada: str | None = None,
) -> None:
    ruta = ruta_semanal(indicador, ano)
    contenido = leer_json_para_actualizar(ruta, {"INDICADOR": indicador, "ANIO": ano, "SEMANA": int(semana), "MES": {}})
    contenido["SEMANA"] = int(semana)

    mes_nombre = nombre_del_mes(mes)

    if mes_nombre:
        contenido["MES"][mes_nombre] = {"Poblacion": poblacion_usada, "Reporte": a_formato_de_disco(unidades)}

    escribir_json(ruta, contenido)


##--------------------------------------

def borrar_mes_semanal(indicador: str, ano: str, mes: str) -> None:
    """
    Quita del semanal el mes que ya tiene reporte definitivo: el semanal solo se lee para
    meses que aun no estan en el definitivo, asi que ya no sirve y el archivo no crece sin
    fin. Si no queda ningun mes semanal pendiente, se borra el archivo.
    """

    ruta = ruta_semanal(indicador, ano)
    contenido = leer_json(ruta)
    mes_nombre = nombre_del_mes(mes)

    if not contenido or mes_nombre not in contenido.get("MES", {}):
        return

    del contenido["MES"][mes_nombre]

    if contenido["MES"]:
        escribir_json(ruta, contenido)
    else:
        ruta.unlink()
