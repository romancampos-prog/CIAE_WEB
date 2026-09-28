"""
Genera y actualiza los 6 indicadores de IAAS de un mes (exclusivo de IAAS): arma
el numerador (Excel por unidad) y el denominador (Excel global para IAAS 01,
capturado a mano para IAAS 02-06), calcula y guarda. Termina al guardar -- el
Excel se pide aparte a /Indicadores/excel.
Usado en: Controller/iaas_Controller.py
"""
from schemas.model.generacion_ftp_Model import ResultadoUnidad
from schemas.model.generacion_iaas_Model import DenominadoresCapturados, ResultadoCompletarUnidad, ResultadoGeneracionIAAS
from services.bd_Ciae_Guardado_Services import guardar_mes_definitivo
from services.iaas.calculo_iaas_Services import calcular_indicador_iaas
from services.iaas.extraccion_excel_iaas_Services import (
    obtener_denominador_iaas01, obtener_denominador_iaas01_unidad, obtener_numerador, validar_excel_unidad,
)
from services.iaas.sesion_iaas_Services import CLAVE_TOTAL, INDICADORES_IAAS, leer_mes_guardado_iaas, nombre_del_mes, pendientes_del_mes


class SesionIAASVaciaError(ValueError):
    """No hay nada guardado ese mes -- hace falta generar el reporte completo antes de completar una unidad."""


def _denominador_bulk(valores: dict[str, str | int | None]) -> dict[str, int]:
    # Mismo criterio de siempre: un denominador vacio/0/None cuenta como "sin capturar", no como cero real.
    return {unidad: int(valor) for unidad, valor in valores.items() if valor}


def generar_iaas(
    anio: str, mes: str, numerador_por_unidad: dict[str, bytes],
    denominador_capturado: DenominadoresCapturados, excel_denominador_iaas01: bytes | None,
) -> ResultadoGeneracionIAAS:
    mes_nombre = nombre_del_mes(mes)
    denominador_iaas01 = obtener_denominador_iaas01(excel_denominador_iaas01) if excel_denominador_iaas01 else {}

    for indicador in INDICADORES_IAAS:
        numerador   = obtener_numerador(numerador_por_unidad, indicador)
        denominador = denominador_iaas01 if indicador == "IAAS 01" else _denominador_bulk(denominador_capturado.get(indicador, {}))
        unidades = calcular_indicador_iaas(indicador, numerador, denominador)
        guardar_mes_definitivo(indicador, anio, mes, unidades)

    pendientes, _ = pendientes_del_mes(leer_mes_guardado_iaas(anio, mes_nombre))
    return ResultadoGeneracionIAAS(mensaje="Reporte IAAS generado", unidades_pendientes=pendientes)


def _resolver_denominador_capturado(nuevo: str | int | None, anterior: int | None) -> int | None:
    """None explicito = el usuario lo marco 'sin dato' a proposito (no se reutiliza lo guardado)."""
    if nuevo is None:
        return None
    texto = str(nuevo).strip()
    return int(texto) if texto.isdigit() else anterior


def completar_unidad_tardia(
    anio: str, mes: str, unidad: str, indicadores_seleccionados: list[str],
    denominadores_capturados: dict[str, str | int | None],
    excel_unidad: bytes | None, excel_denominador_iaas01: bytes | None,
) -> ResultadoCompletarUnidad:
    mes_nombre   = nombre_del_mes(mes)
    datos_sesion = leer_mes_guardado_iaas(anio, mes_nombre)
    if not any(datos_sesion.values()):
        raise SesionIAASVaciaError(f"No hay sesión guardada para {mes_nombre} {anio}. Genera el reporte completo primero.")

    if excel_unidad is not None and indicadores_seleccionados:
        validar_excel_unidad(excel_unidad, unidad, indicadores_seleccionados[0])

    for indicador in indicadores_seleccionados:
        anterior = datos_sesion.get(indicador, {}).get(unidad)

        if indicador == "IAAS 01":
            numerador = (
                obtener_numerador({unidad: excel_unidad}, indicador).get(unidad)
                if excel_unidad is not None else (anterior.numerador if anterior else None)
            )
            denominador = (
                obtener_denominador_iaas01_unidad(excel_denominador_iaas01, unidad)
                if excel_denominador_iaas01 is not None else (anterior.denominador if anterior else None)
            )
        else:
            numerador = (
                obtener_numerador({unidad: excel_unidad}, indicador).get(unidad, 0)
                if excel_unidad is not None else (anterior.numerador if anterior else None)
            )
            if indicador in denominadores_capturados:
                denominador = _resolver_denominador_capturado(denominadores_capturados[indicador], anterior.denominador if anterior else None)
            else:
                denominador = anterior.denominador if anterior else None

        datos_sesion.setdefault(indicador, {})[unidad] = ResultadoUnidad(numerador=numerador, denominador=denominador)

    for indicador in indicadores_seleccionados:
        unidades_indicador = {u: d for u, d in datos_sesion.get(indicador, {}).items() if u != CLAVE_TOTAL}
        numerador_ind   = {u: d.numerador for u, d in unidades_indicador.items() if d.numerador is not None}
        denominador_ind = {u: d.denominador for u, d in unidades_indicador.items() if d.denominador is not None}
        guardar_mes_definitivo(indicador, anio, mes, calcular_indicador_iaas(indicador, numerador_ind, denominador_ind))

    pendientes, _ = pendientes_del_mes(leer_mes_guardado_iaas(anio, mes_nombre))
    return ResultadoCompletarUnidad(unidades_pendientes=pendientes)
