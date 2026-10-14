"""
Lo que la pagina de Generar de FTP necesita de cada indicador: lo comun del mapeo
(indicadores_del_modulo) mas los reportes SIAIS que lee.
Usado en: Controller/ftp_Controller.py
"""
from schemas.model.indicadorGenerar_Model import IndicadorGenerarFTP
from schemas.model.reporte_mapeo_Model import FuenteArchivosFTP
from services.indicadorMapeo_Services import cargar_indicador_mapeo, indicadores_del_modulo


def indicadores_para_generar() -> list[IndicadorGenerarFTP]:
    lista = []
    for base in indicadores_del_modulo("ftp"):
        reporte = cargar_indicador_mapeo(base.indicador).reporte
        # "CP03_A"/"CP03_B" son dos hojas del mismo reporte: se lista una vez como "CP03".
        reportes = list(dict.fromkeys(
            codigo.split("_")[0]
            for lado in (reporte.numerador, reporte.denominador) if isinstance(lado, FuenteArchivosFTP)
            for codigo in lado.archivo
        ))
        lista.append(IndicadorGenerarFTP(**base.model_dump(), reportes=reportes))
    return lista
