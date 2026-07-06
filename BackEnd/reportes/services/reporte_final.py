"""
Módulo  : reporte_final.py
Carpeta : reportes/services/
Qué hace: Orquesta el pipeline completo para generar el Excel de un indicador FTP individual.
Usado en: reportes/controllers/reportes_controller.py
"""
import json
from indicadores_FTP.services.FTP_service import obtenerInformacionIndicador
from indicadores_FTP.services.ftp_extraer import ExtraerInformacionPrevia
from reportes.services.numerador_denominador import ObtenerNumDen
from reportes.services.semaforizado import Semaforizado
from reportes.services.generar_excel import ExcelFinalConPlantilla
from reportes.services.datos_json_service import guardar_datos_en_json, guardar_semana_en_json


def ExcelReporteFinal(indicador, ano, mes, semana):
    informacionIndicador = obtenerInformacionIndicador(indicador)

    indicadorReportes  = informacionIndicador.get("reporte", {})
    indicadorOperacion = informacionIndicador.get("operacion", {})
    indicadorSemaforo  = informacionIndicador.get("semaforo", {})
    indicadorTitulo    = informacionIndicador.get("titulo")
    indicadordesNum    = informacionIndicador.get("descripcionNumerador")
    indicadordesDen    = informacionIndicador.get("descripcionDenominador")
    indicadoresArch    = informacionIndicador.get("nombreArchivoFinal")
    indicadorDecimal   = informacionIndicador.get("decimales")
    MESES_CIP01        = informacionIndicador.get("MESES_CIP01", {})

    diccionarioPrevio, diccionarioErrores = ExtraerInformacionPrevia(indicadorReportes, ano, mes, semana, MESES_CIP01)
    print("////////////////////////////////////////////////////////////////////////")
    print("INFORMACION PREVIA")
    print(json.dumps(diccionarioPrevio, indent=4, ensure_ascii=False))

    print("REPORTES DE ERRORES POR UNIDAD:")
    print(json.dumps(diccionarioErrores, indent=4, ensure_ascii=False))

    diccionarioPrevio, errores_calculo = ObtenerNumDen(diccionarioPrevio, indicadorOperacion, indicadorDecimal)
    if errores_calculo:
        diccionarioErrores["CALCULO_FALLIDO"] = {
            "nombreError": "Error de cálculo",
            "descripcionError": "Falló la evaluación de la fórmula del indicador para estas unidades.",
            "unidades": {u: [{"reportes": ["cálculo"], "ruta": msg}] for u, msg in errores_calculo.items()}
        }
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
        es_semana=es_semana
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
