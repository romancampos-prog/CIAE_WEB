"""
Estado guardado de IAAS por mes (exclusivo de IAAS): que unidades/indicadores
quedaron pendientes despues de generar, para completarlos despues (unidad
tardia) sin tener que resubir el mes completo.
Usado en: services/iaas/generacion_iaas_Services.py, Controller/iaas_Controller.py
"""
from schemas.model.generacion_ftp_Model import UnidadSemaforizada
from schemas.model.generacion_iaas_Model import SesionIAAS
from services.bd_Ciae_Guardado_Services import leer_historico_indicador, meses_con_datos
from shared.MESES import MESES_ESTANDAR
from shared.UNIDADES import ORDEN_DEMAS_IAAS

INDICADORES_IAAS = [f"IAAS 0{n}" for n in range(1, 7)]
CLAVE_TOTAL = "TOTAL_OOAD"


def nombre_del_mes(mes: str) -> str:
    return MESES_ESTANDAR[int(mes) - 1]


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
            for unidad, valores in mes_data.items()
        }
    return datos


def pendientes_del_mes(datos_mes: dict[str, dict[str, UnidadSemaforizada]]) -> tuple[list[str], dict[str, list[str]]]:
    """
    Unidades con algun indicador sin denominador ese mes -- el numerador puede
    faltar porque la unidad simplemente no subio su Excel, pero el denominador en
    None es la señal real de "faltó algo" (capturado a mano o del Excel global).
    Regresa (unidades, {unidad: [indicadores pendientes]}).
    """
    if not any(datos_mes.values()):
        return [], {}

    pendientes: dict[str, list[str]] = {}
    for unidad in ORDEN_DEMAS_IAAS:
        faltan = [
            indicador for indicador in INDICADORES_IAAS
            if (dato := datos_mes.get(indicador, {}).get(unidad)) is None or dato.denominador is None
        ]
        if faltan:
            pendientes[unidad] = faltan
    return list(pendientes), pendientes


def meses_guardados_iaas(anio: str) -> list[str]:
    """
    Meses con reporte guardado ese año, como "01".."12" -- los 6 indicadores siempre se
    generan juntos (mismos meses), asi que basta con el primero que tenga datos.
    """
    for indicador in INDICADORES_IAAS:
        meses = meses_con_datos(indicador, anio)
        if meses:
            return sorted(meses, key=int)
    return []


def armar_sesion(anio: str, mes: str) -> SesionIAAS | None:
    """None si no hay absolutamente nada guardado ni pendiente ese mes (sesion vacia)."""
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
