"""
Informacion exclusiva de IAAS para el frontend que no cubre la ficha generica
(catalogo de unidades, columnas del Excel para Generar) -- sale del mapeo unificado.
Usado en: Controller/iaas_Controller.py
"""
from schemas.model.indicadorGenerar_Model import IndicadorGenerarIAAS
from services.indicadorMapeo_Services import cargar_indicador_iaas, indicadores_del_modulo
from shared.UNIDADES import ORDEN_DEMAS_IAAS


def unidades_iaas() -> list[str]:
    return ORDEN_DEMAS_IAAS


def indicadores_para_generar() -> list[IndicadorGenerarIAAS]:
    """Lo comun del mapeo (indicadores_del_modulo) mas los rotulos de columnas del Excel que se sube."""
    lista = []
    for base in indicadores_del_modulo("iaas"):
        excel = cargar_indicador_iaas(base.indicador).excel
        lista.append(IndicadorGenerarIAAS(
            **base.model_dump(), columnaNumerador=excel.columnaNumerador, columnaDenominador=excel.columnaDenominador,
        ))
    return lista
