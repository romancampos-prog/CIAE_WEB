"""
Informacion de los 6 indicadores IAAS para el frontend (titulo, semaforo, columnas
del Excel, unidades participantes) -- exclusivo de IAAS, sale del mapeo unificado.
Usado en: Controller/iaas_Controller.py
"""
from schemas.model.generacion_iaas_Model import IndicadorGenerarIAAS, InfoIndicadorIAAS
from services.indicadorMapeo_Services import cargar_mapeo_iaas
from shared.reglas_periodicidad import descripcion_periodicidad
from shared.semaforo_service import es_agrupado
from shared.UNIDADES import ORDEN_DEMAS_IAAS, UNIDAD_TIPO_IAAS01, UNIDADES_HGS_IAAS01


def info_todos_iaas() -> dict[str, InfoIndicadorIAAS]:
    """{indicador: InfoIndicadorIAAS} de los que se muestran en grafica."""
    resultado: dict[str, InfoIndicadorIAAS] = {}

    for indicador, mapeo in cargar_mapeo_iaas().items():
        if not mapeo.mostrarGrafica:
            continue
        # Si el semaforo esta partido por grupo (IAAS 01: tipo de hospital) el front
        # necesita saber a que grupo pertenece cada unidad.
        agrupado = es_agrupado(mapeo.semaforo)
        resultado[indicador] = InfoIndicadorIAAS(
            titulo=mapeo.informacion.titulo,
            descripcionNumerador=mapeo.informacion.descNum,
            descripcionDenominador=mapeo.informacion.descDen,
            descripcionPeriodicidad=descripcion_periodicidad(mapeo.periodicidad),
            semaforo=mapeo.semaforo,
            unidades_hgs=UNIDADES_HGS_IAAS01 if agrupado else [],
            unidad_tipo=UNIDAD_TIPO_IAAS01 if agrupado else {},
        )

    return resultado


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
