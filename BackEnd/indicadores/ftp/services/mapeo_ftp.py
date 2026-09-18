"""
Lectura del mapeo UNIFICADO (indicadores/mapeo/{familia}.json) para los
indicadores de FTP: la ficha (titulo, semaforo, periodicidad, nombre de
archivo) y, para los automatizados, tambien lo que necesita la extraccion.
Es la unica fuente de configuracion de indicadores FTP -- ya no se lee nada
de ftp/mapeo/.
Usado en: reporte_final.py, reporte_categoria.py, grafica_service.py,
          ftp_extraer_unificado.py, recalcular_poblacion_service.py, editar_service.py
"""
import json

from ftp.config import RUTA_MAPEO_UNIFICADO
from schemas.model.reporte_mapeo_Model import FichaFTPMapeo, IndicadorFTPMapeo


def ruta_familia(indicador: str):
    return RUTA_MAPEO_UNIFICADO / f"{indicador.split()[0]}.json"


def _bloque_crudo(indicador: str) -> dict:
    with open(ruta_familia(indicador), encoding="utf-8") as f:
        return json.load(f)[indicador]


def cargar_ficha_ftp(indicador: str) -> FichaFTPMapeo:
    return FichaFTPMapeo.model_validate(_bloque_crudo(indicador))


def cargar_indicador_mapeo(indicador: str) -> IndicadorFTPMapeo:
    return IndicadorFTPMapeo.model_validate(_bloque_crudo(indicador))
