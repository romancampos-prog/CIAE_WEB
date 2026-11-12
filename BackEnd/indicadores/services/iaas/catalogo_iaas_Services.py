"""
Los 6 indicadores de IAAS y que unidades lleva cada uno.
Usado en: services/iaas/*, services/excel/excel_iaas_Services.py
"""
from shared.UNIDADES import ORDEN_DEMAS_IAAS, ORDEN_IAAS01

INDICADORES_IAAS = [f"IAAS 0{n}" for n in range(1, 7)]


def unidades_del_indicador(indicador: str, numerador: dict, denominador: dict) -> list[str]:
    """
    Las unidades esperadas del indicador mas las que traigan dato: una unidad esperada sin
    numerador o denominador queda Gris, no como un 0 que nunca se reporto.
    """
    unidades = list(ORDEN_IAAS01 if indicador == "IAAS 01" else ORDEN_DEMAS_IAAS)

    for unidad in [*numerador, *denominador]:
        if unidad not in unidades:
            unidades.append(unidad)

    return unidades
