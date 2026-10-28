"""
El reporte de un indicador tal como se lee de BD_CIAE (graficas y Excel): unidad, mes,
semanal (previo) y el año completo.
Usado en: services/reporte_guardado/*, services/grafica/*, services/excel/*, services/extractor/corte_semestral_Services.py
"""
from typing import Dict, Literal

from pydantic import BaseModel, Field


class UnidadDatos(BaseModel):
    numerador:   float | None = None
    denominador: float | None = None
    desempeno:   Literal["Esperado", "Medio", "Bajo", "Gris"]
    resultado:   float | None = Field(None, alias = "%")


##--------------------------------------

class MesReporte(BaseModel):
    """
    Un mes (o corte) ya guardado: el reporte por unidad y con que poblacion se calculo (None
    si el indicador no depende de poblacion o no se pudo detectar el mes/año del archivo).
    """
    Poblacion: str | None = None
    Reporte:   Dict[str, UnidadDatos]


##--------------------------------------

class ReportePrevio(BaseModel):
    SEMANA: int
    MES:    Dict[str, MesReporte]


##--------------------------------------

class ReporteIndicador(BaseModel):
    INDICADOR:    str
    ANIO:         int
    MESES:        Dict[str, MesReporte]
    SEMANA:       ReportePrevio | None = None
    MENSUAL_ACUMULADO: Dict[str, MesReporte] | None = None
