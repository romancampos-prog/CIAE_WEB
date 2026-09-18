"""
Orquesta el pipeline completo para generar el Excel de un indicador FTP individual.
Usado en: ftp/controllers/reportes_controller.py
"""
import json
from ftp.services.mapeo_ftp import cargar_ficha_ftp
from ftp.services.ftp_extraer_unificado import ExtraerYCalcularIndicadorUnificado
from ftp.services.semaforizado import Semaforizado
from ftp.services.generar_excel import ExcelFinalConPlantilla
from ftp.services.datos_json_service import (
    guardar_datos_en_json, guardar_semana_en_json, borrar_semana_del_mes, leer_mes_guardado,
)


def ExcelReporteFinal(indicador, ano, mes, semana):
    ficha = cargar_ficha_ftp(indicador)

    indicadorSemaforo  = ficha.semaforo
    indicadorTitulo    = ficha.informacion.titulo
    indicadordesNum    = ficha.informacion.descNum
    indicadordesDen    = ficha.informacion.descDen
    indicadoresArch    = ficha.nombreArchivoFinal
    indicadorPeriodo   = ficha.periodicidad

    diccionarioPrevio, diccionarioErrores = ExtraerYCalcularIndicadorUnificado(indicador, ano, mes, semana)
    print("REPORTES DE ERRORES POR UNIDAD:")
    print(json.dumps(diccionarioErrores, indent=4, ensure_ascii=False))
    print("////////////////////////////////////////////////////////////////////////")
    print("NUMERADOR Y DENOMINADOR")
    print(json.dumps(diccionarioPrevio, indent=4, ensure_ascii=False))

    diccionarioPrevio = Semaforizado(diccionarioPrevio, indicadorSemaforo, mes)
    print("////////////////////////////////////////////////////////////////////////")
    print("SEMAFORIZADO")
    print(json.dumps(diccionarioPrevio, indent=4, ensure_ascii=False))

    es_semana = bool(
        semana is not None and
        str(semana).strip() not in ("", "None", "none")
    )

    if not es_semana:
        guardar_datos_en_json(indicador, ano, mes, diccionarioPrevio)
        borrar_semana_del_mes(indicador, ano, mes)
    else:
        guardar_semana_en_json(indicador, ano, mes, semana, diccionarioPrevio)

    archivo_descargable = ExcelFinalConPlantilla(
        diccionarioPrevio,
        indicadorTitulo,
        indicadordesNum,
        indicadordesDen,
        indicadoresArch,
        ano,
        mes,
        semana,
        indicadorSemaforo,
        indicador,
        es_semana=es_semana,
        periodicidad=indicadorPeriodo,
    )

    if archivo_descargable:
        semana_str   = str(semana).strip() if semana is not None else ""
        nombre_final = (
            f"{indicadoresArch}_{ano}_{mes}_S{semana_str}.xlsx"
            if (semana_str and semana_str.lower() != "none")
            else f"{indicadoresArch}_{ano}_{mes}.xlsx"
        )

        return {
            "status":          "success",
            "mensaje":         f"Reporte {indicador} generado correctamente",
            "stream":          archivo_descargable,
            "nombre_archivo":  nombre_final,
            "restricciones":   diccionarioErrores,
            "graficar":        diccionarioPrevio
        }
    else:
        return {
            "status":   "error",
            "mensaje":  "No se pudo generar el archivo Excel",
            "errores":  diccionarioErrores
        }


def ExcelReporteGuardado(indicador, ano, mes):
    """
    Variante de solo lectura de ExcelReporteFinal -- usada al descargar desde
    gráficas. A diferencia de ExcelReporteFinal, NUNCA extrae de FTP ni calcula
    nada: solo toma lo que ya está guardado (definitivo o semanal, ver
    leer_mes_guardado) y lo vuelca al Excel. Si ese mes no tiene ningún dato
    guardado, no genera nada nuevo -- devuelve error. Así "ver/descargar" desde
    gráficas nunca puede cerrar un mes ni pisar el respaldo semanal.
    """
    ficha = cargar_ficha_ftp(indicador)
    indicadorSemaforo  = ficha.semaforo
    indicadorTitulo    = ficha.informacion.titulo
    indicadordesNum    = ficha.informacion.descNum
    indicadordesDen    = ficha.informacion.descDen
    indicadoresArch    = ficha.nombreArchivoFinal
    indicadorPeriodo   = ficha.periodicidad

    diccionarioPrevio, es_semana, semana = leer_mes_guardado(indicador, ano, mes)
    if diccionarioPrevio is None:
        return {
            "status":  "error",
            "mensaje": f"{indicador} no tiene ningún dato guardado para ese mes todavía.",
        }

    archivo_descargable = ExcelFinalConPlantilla(
        diccionarioPrevio,
        indicadorTitulo,
        indicadordesNum,
        indicadordesDen,
        indicadoresArch,
        ano,
        mes,
        semana,
        indicadorSemaforo,
        indicador,
        es_semana=es_semana,
        periodicidad=indicadorPeriodo,
    )

    if not archivo_descargable:
        return {"status": "error", "mensaje": "No se pudo generar el archivo Excel"}

    semana_str   = str(semana) if semana is not None else ""
    nombre_final = (
        f"{indicadoresArch}_{ano}_{mes}_S{semana_str}.xlsx"
        if semana_str else f"{indicadoresArch}_{ano}_{mes}.xlsx"
    )
    return {
        "status":         "success",
        "mensaje":        f"Reporte {indicador} obtenido correctamente",
        "stream":         archivo_descargable,
        "nombre_archivo": nombre_final,
    }
