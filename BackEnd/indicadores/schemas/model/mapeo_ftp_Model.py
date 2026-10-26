"""
Mapeo crudo de un indicador de FTP (mapeo/ftp/): los reportes SIAIS que lee y la ficha.
Usado en: datos/lectura_mapeo/mapeo_por_modulo_Datos.py, services/ftp/*
"""
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field

from schemas.model.ficha_indicador_Model import Operacion
from schemas.model.mapeo_comun_Model import FichaMapeo, FuentePoblacionInfoSalud


class FuenteArchivosFTP(BaseModel):
    fuente:  Literal["ftp"]
    archivo: dict[str, dict[str, Any]]


##--------------------------------------

class ReporteFTPMapeo(BaseModel):
    numerador:   FuenteArchivosFTP
    denominador: Annotated[FuenteArchivosFTP | FuentePoblacionInfoSalud, Field(discriminator="fuente")]
    operacion:   Operacion


##--------------------------------------

class IndicadorFTPMapeo(FichaMapeo):
    """Indicador FTP automatizado: la ficha mas todo lo que la extraccion necesita."""
    reporte:             ReporteFTPMapeo
    MESES_CIP01:         dict[str, str] = {}
    # Otros marcadores de "columna que cambia segun el mes" ademas de MESES_CIP01,
    # ej. {"POBLACION_CIP01": {"1": "C", ..., "7": "R"}} para usarlos en columna_dato.
    COLUMNAS_POR_MES:    dict[str, dict[str, str]] = {}
    unidadesSinServicio: list[str] = []

    def marcadores_por_mes(self) -> dict[str, dict[str, str]]:
        return {"MESES_CIP01": self.MESES_CIP01, **self.COLUMNAS_POR_MES}
