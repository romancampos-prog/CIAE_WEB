"""
Arma el resultado (numerador, denominador, tasa, semaforo) de IAAS a partir de los Excel subidos.
La lectura de los Excel vive en extraccion_unificada.py y el semaforo en semaforo_iaas.py.
Usado en: iaas/services/procesar_service.py
"""
from iaas.config import ORDEN_IAAS01, ORDEN_DEMAS_IAAS
from iaas.services.semaforo_iaas import semaforizar_iaas
from iaas.services.extraccion_unificada import (
    obtener_numerador, obtener_denominador_IAAS01, obtener_denominador_IAAS01_unidad, validar_excel_unidad,
)


def calcular_IAAS(indicador: str, numeradores: dict, denominador=None) -> dict:
    resultado = {}

    if indicador == "IAAS 01":
        if denominador is None:
            return {}
        dens = obtener_denominador_IAAS01(denominador)
        nums = obtener_numerador(numeradores, indicador)

        # Se recorre la lista completa de unidades esperadas (no solo las que trajeron
        # numerador o denominador) para que ninguna quede fuera del JSON aunque no
        # tenga ningun dato ese mes -- queda con null en vez de simplemente no existir.
        for u in set(ORDEN_IAAS01) | set(nums) | set(dens):
            resultado[u] = {
                # nums.get(u) sin default: si la unidad nunca se subio, queda None
                # (incompleto) en vez de simular un 0 real que nunca se reporto.
                "numerador":   nums.get(u),
                "denominador": dens.get(u)
            }
        return semaforizar_iaas(resultado, indicador)

    else:
        nums     = obtener_numerador(numeradores, indicador)
        dens_raw = (denominador or {}).get(indicador, {})
        dens     = {u: int(v) for u, v in dens_raw.items() if v}

        # Se recorre la lista completa de unidades esperadas (no solo las que trajeron
        # numerador o denominador) para que ninguna quede fuera del JSON aunque no
        # tenga ningun dato ese mes -- queda con null en vez de simplemente no existir.
        for u in set(ORDEN_DEMAS_IAAS) | set(nums) | set(dens):
            if u == "TOTAL_OOAD":
                continue
            resultado[u] = {
                # nums.get(u) sin default: si la unidad nunca se subio, queda None
                # (incompleto) en vez de simular un 0 real que nunca se reporto.
                "numerador":   nums.get(u),
                "denominador": dens.get(u)
            }
        return semaforizar_iaas(resultado, indicador)


def calcular_unidad_tardia(
    unidad: str,
    excel_unidad: bytes | None,
    indicadores_seleccionados: list,
    denominadores_02_06: dict,
    datos_sesion: dict,
    excel_denominador_iaas01: bytes | None = None,
) -> dict:
    """
    Recalcula los indicadores seleccionados para una única unidad tardía.
    Si excel_unidad es None, reutiliza el numerador ya guardado en sesión.
    """
    if excel_unidad is not None:
        if indicadores_seleccionados:
            validar_excel_unidad(excel_unidad, unidad, indicadores_seleccionados[0])
        nums_unidad = {unidad: excel_unidad}
    else:
        nums_unidad = None

    resultado = {}

    for ind in indicadores_seleccionados:
        if ind == "IAAS 01":
            if unidad not in ORDEN_IAAS01:
                continue
            num = (
                obtener_numerador(nums_unidad, "IAAS 01").get(unidad)
                if nums_unidad is not None
                else (datos_sesion.get("IAAS 01", {}).get(unidad) or {}).get("numerador")
            )
            den = (
                obtener_denominador_IAAS01_unidad(excel_denominador_iaas01, unidad)
                if excel_denominador_iaas01 is not None
                else (datos_sesion.get("IAAS 01", {}).get(unidad) or {}).get("denominador")
            )
            raw = {unidad: {"numerador": num, "denominador": den}}
            resultado["IAAS 01"] = semaforizar_iaas(raw, "IAAS 01")
        else:
            num = (
                obtener_numerador(nums_unidad, ind).get(unidad, 0)
                if nums_unidad is not None
                else (datos_sesion.get(ind, {}).get(unidad) or {}).get("numerador")
            )
            if ind in denominadores_02_06 and denominadores_02_06[ind] is None:
                # El usuario marcó "sin dato" a propósito -- se deja nulo (Gris),
                # no se reutiliza el valor previo guardado en sesión.
                den = None
            else:
                den_v = str(denominadores_02_06.get(ind, "")).strip()
                den = int(den_v) if den_v.isdigit() else (datos_sesion.get(ind, {}).get(unidad) or {}).get("denominador")
            raw = {unidad: {"numerador": num, "denominador": den}}
            resultado[ind] = semaforizar_iaas(raw, ind)

    return resultado
