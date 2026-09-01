from pydantic import BaseModel, Field
from typing import Literal, Dict
from shared.PERIODICIDAD import PERIODICIDAD


class UnidadDatos(BaseModel):
    numerador:   float | None = None
    denominador: float | None = None
    desempeno:   Literal["Esperado", "Medio", "Bajo", "Gris"]
    resultado:   float | None = Field(None, alias = "%")
    

class ReportePrevio(BaseModel):
    SEMANA: int
    MES:    Dict[str, Dict[str, UnidadDatos]]
        


class ReporteIndicador(BaseModel):
    INDICADOR:    str
    ANIO:         int
    MESES:        Dict[str, Dict[str, UnidadDatos]]
    SEMANA:       ReportePrevio | None = None
    

#---------------------------------------------------
#CLASES PARA EXTRAER SOLO INFORMAICON VISUAL DEL INDICADOR
class InformaionFicha(BaseModel):
    titulo: str
    objetivo: str
    descNum: str
    descDen: str
    
class Semaforo(BaseModel):
    Esperado: str | None = None
    Medio: str | None = None
    Bajo: str | None = None
    

class InfoVisualIndicador(BaseModel):
    modulo: str
    mostrarGenerar: bool
    mostrarGrafica: bool
    periodicidad: str
    informacion: InformaionFicha | None = None
    semaforo: Dict[str,Semaforo] | Semaforo

