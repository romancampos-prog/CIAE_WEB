"""
Valores de una unidad en cada paso de la generacion: lo extraido -> lo calculado -> lo
semaforizado. Los usan FTP, IAAS, Extractor, el calculo y el semaforo.
Usado en: services/*, datos/bd_ciae/guardar_mes_Datos.py
"""
from typing import Literal

from pydantic import BaseModel, Field

ColorSemaforo = Literal["Esperado", "Medio", "Bajo", "Gris"]

# {nombre del reporte o grupo: valores leidos (uno por columna), o None si no se pudo leer}
ValoresPorFuente = dict[str, list[float] | None]


# Valores por unidad: extraido -> calculado -> semaforizado
class DatosExtraidosUnidad(BaseModel):
    """Lo leido de los reportes (o de la poblacion) para una unidad, antes de calcular."""
    numerador:   ValoresPorFuente = Field(default_factory=dict)
    denominador: ValoresPorFuente = Field(default_factory=dict)


##--------------------------------------

class ResultadoUnidad(BaseModel):
    numerador:   int | None = None
    denominador: int | None = None
    resultado:   int | float | None = None


##--------------------------------------

class UnidadSemaforizada(ResultadoUnidad):
    color: ColorSemaforo = "Gris"
