"""
Lo que pide la pagina de Generar IAAS: los indicadores (con los rotulos de columnas del Excel
que se sube) y las unidades.
Usado en: Controller/iaas_Controller.py
"""
from datos.lectura_mapeo.mapeo_por_modulo_Datos import cargar_indicador_iaas
from schemas.model.pagina_generar_Model import IndicadorGenerarIAAS
from services.informacion.lista_indicadores_Services import indicadores_del_modulo
from shared.UNIDADES import ORDEN_DEMAS_IAAS


def indicadores_para_generar() -> list[IndicadorGenerarIAAS]:
    """Lo comun del mapeo mas los rotulos de columnas del Excel que se sube."""
    lista = []

    for base in indicadores_del_modulo("iaas"):
        excel = cargar_indicador_iaas(base.indicador).excel
        lista.append(IndicadorGenerarIAAS(
            **base.model_dump(), columnaNumerador=excel.columnaNumerador, columnaDenominador=excel.columnaDenominador,
        ))

    return lista


##--------------------------------------

def unidades_iaas() -> list[str]:
    """Las unidades de IAAS en el orden en que se capturan (mapeo/unidades/iaas.json)."""
    return ORDEN_DEMAS_IAAS
