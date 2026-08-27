from pydantic import BaseModel, Field
from typing import Literal, Dict


class UnidadDatos(BaseModel):
    numerador:   float | None = None
    denominador: float | None = None
    desempeno:   Literal["Esperado", "Medio", "Bajo", "Gris"]
    resultado:   float | None = Field(None, alias = "%")
    

class ReportePrevio(BaseModel):
    SEMANA: int
    MES: Dict[str, Dict[str, UnidadDatos]]
        


class ReporteIndicador(BaseModel):
    INDICADOR : str
    ANIO: int
    PREVIOS: bool
    MESES: Dict[str, Dict[str, UnidadDatos]]
    SEMANA: ReportePrevio | None = None
    