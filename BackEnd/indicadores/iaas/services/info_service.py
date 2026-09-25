from iaas.config import ORDEN_DEMAS_IAAS, UNIDADES_HGS_IAAS01, UNIDAD_TIPO_IAAS01
from iaas.services.extraccion_unificada import cargar_mapeo_iaas
from shared.semaforo_service import es_agrupado
from shared.reglas_periodicidad import descripcion_periodicidad


def infoAllIAAS() -> dict:
    """Titulo, descripciones y semaforo de cada indicador IAAS, del mapeo unificado (semaforo en texto con operadores)."""
    resultado = {}

    for indicador, mapeo in cargar_mapeo_iaas().items():
        if not mapeo.mostrarGrafica:
            continue
        # Si el semaforo esta partido por grupo (IAAS 01: tipo de hospital) el front
        # necesita saber a que grupo pertenece cada unidad.
        agrupado = es_agrupado(mapeo.semaforo)
        resultado[indicador] = {
            "titulo":                 mapeo.informacion.titulo,
            "descripcionNumerador":   mapeo.informacion.descNum,
            "descripcionDenominador": mapeo.informacion.descDen,
            "descripcionPeriodicidad": descripcion_periodicidad(mapeo.periodicidad),
            "semaforo":               mapeo.semaforo,
            "unidades_hgs":           UNIDADES_HGS_IAAS01 if agrupado else [],
            "unidad_tipo":            UNIDAD_TIPO_IAAS01   if agrupado else {},
        }

    return resultado


def obtenerUnidadesIAAS() -> list:
    return ORDEN_DEMAS_IAAS


def obtenerIndicadoresIAAS() -> list:
    """Indicadores IAAS que se generan, con los rotulos de sus columnas (del mapeo unificado)."""
    return [
        {
            "id":                 indicador,
            "titulo":             mapeo.informacion.titulo,
            "columnaNumerador":   mapeo.excel.columnaNumerador,
            "columnaDenominador": mapeo.excel.columnaDenominador,
        }
        for indicador, mapeo in cargar_mapeo_iaas().items()
        if mapeo.mostrarGenerar
    ]
