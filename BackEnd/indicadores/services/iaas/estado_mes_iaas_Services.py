"""
Lo ya guardado de IAAS en un mes y que unidades quedaron pendientes (para completarlas despues
sin resubir todo), y los meses generados del año.
Usado en: Controller/iaas_Controller.py, services/iaas/generar_mes_iaas_Services.py, services/iaas/completar_unidad_iaas_Services.py
"""
from datos.bd_ciae.historico_indicador_Datos import leer_historico_indicador, meses_con_datos
from schemas.model.iaas_Model import SesionIAAS
from schemas.model.unidad_resultado_Model import UnidadSemaforizada
from services.calculo.resultado_unidades_Services import CLAVE_TOTAL
from services.iaas.catalogo_iaas_Services import INDICADORES_IAAS
from shared.MESES import nombre_del_mes
from shared.UNIDADES import ORDEN_DEMAS_IAAS


def leer_mes_guardado_iaas(anio: str, mes_nombre: str) -> dict[str, dict[str, UnidadSemaforizada]]:
    """{indicador: {unidad: UnidadSemaforizada}} de lo ya guardado ese mes; {} por indicador si no hay nada."""
    datos: dict[str, dict[str, UnidadSemaforizada]] = {}

    for indicador in INDICADORES_IAAS:
        mes_data = leer_historico_indicador(indicador, anio).get("MESES", {}).get(mes_nombre, {})
        datos[indicador] = {
            unidad: UnidadSemaforizada(
                numerador=valores.get("numerador"), denominador=valores.get("denominador"),
                resultado=valores.get("%"), color=valores.get("desempeno") or "Gris",
            )
            for unidad, valores in mes_data.get("Reporte", {}).items()
        }

    return datos


##--------------------------------------

def pendientes_del_mes(datos_mes: dict[str, dict[str, UnidadSemaforizada]]) -> tuple[list[str], dict[str, list[str]]]:
    """
    Unidades con algun indicador sin denominador ese mes: el numerador puede faltar porque la
    unidad no subio su Excel, pero el denominador en None es la señal real de "faltó algo".
    Regresa (unidades, {unidad: [indicadores pendientes]}).
    """

    if not any(datos_mes.values()):
        return [], {}

    pendientes: dict[str, list[str]] = {}

    for unidad in ORDEN_DEMAS_IAAS:
        faltan = []

        for indicador in INDICADORES_IAAS:
            dato = datos_mes.get(indicador, {}).get(unidad)
            if dato is None or dato.denominador is None:
                faltan.append(indicador)

        if faltan:
            pendientes[unidad] = faltan

    return list(pendientes), pendientes


##--------------------------------------

def meses_generados_iaas(anio: str) -> list[str]:
    """
    Meses con reporte guardado ese año ("01".."12"): los 6 indicadores siempre se generan
    juntos, asi que basta con el primero que tenga datos.
    """

    for indicador in INDICADORES_IAAS:
        meses = meses_con_datos(indicador, anio)
        if meses:
            return sorted(meses, key=int)

    return []


##--------------------------------------

def estado_del_mes(anio: str, mes: str) -> SesionIAAS | None:
    """Lo guardado y lo pendiente del mes, para el modal de unidades tardias. None si no hay nada."""

    mes_nombre = nombre_del_mes(mes)
    datos_mes  = leer_mes_guardado_iaas(anio, mes_nombre)
    pendientes, indicadores_pendientes = pendientes_del_mes(datos_mes)

    numeradores_guardados:   dict[str, dict[str, float | None]] = {}
    denominadores_guardados: dict[str, dict[str, float | None]] = {}

    for indicador, unidades in datos_mes.items():
        for unidad, dato in unidades.items():
            if unidad == CLAVE_TOTAL:
                continue
            numeradores_guardados.setdefault(unidad, {})[indicador]   = dato.numerador
            denominadores_guardados.setdefault(unidad, {})[indicador] = dato.denominador

    if not numeradores_guardados and not pendientes:
        return None

    return SesionIAAS(
        anio=anio, mes=mes, mes_nombre=mes_nombre,
        unidades_pendientes=pendientes, indicadores_pendientes=indicadores_pendientes,
        denominadores_guardados=denominadores_guardados, numeradores_guardados=numeradores_guardados,
    )
