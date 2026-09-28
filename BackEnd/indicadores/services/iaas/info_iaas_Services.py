"""
Informacion exclusiva de IAAS para el frontend que no cubre la ficha generica
(catalogo de unidades, columnas del Excel para Generar) -- sale del mapeo unificado.
Usado en: Controller/iaas_Controller.py
"""
from schemas.model.generacion_iaas_Model import IndicadorGenerarIAAS
from services.indicadorMapeo_Services import cargar_mapeo_iaas
from shared.UNIDADES import ORDEN_DEMAS_IAAS


def unidades_iaas() -> list[str]:
    return ORDEN_DEMAS_IAAS


def indicadores_para_generar() -> list[IndicadorGenerarIAAS]:
    """Indicadores IAAS que se generan, con los rotulos de columnas de su Excel."""
    return [
        IndicadorGenerarIAAS(
            id=indicador, titulo=mapeo.informacion.titulo,
            columnaNumerador=mapeo.excel.columnaNumerador, columnaDenominador=mapeo.excel.columnaDenominador,
        )
        for indicador, mapeo in cargar_mapeo_iaas().items()
        if mapeo.mostrarGenerar
    ]
