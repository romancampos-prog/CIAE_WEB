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
    MENSUAL_ACUMULADO: Dict[str, Dict[str, UnidadDatos]] | None
    

#---------------------------------------------------
#CLASES PARA EXTRAER SOLO INFORMAICON VISUAL DEL INDICADOR
class InformacionFicha(BaseModel):
    titulo: str
    objetivo: str
    descNum: str
    descDen: str
    
class Semaforo(BaseModel):
    Esperado: str | None = None
    Medio: str | None = None
    Bajo: str | None = None
    

class InfoIndicador(BaseModel):
    modulo: str
    mostrarGenerar: bool
    mostrarGrafica: bool
    previos: bool
    periodicidad: str
    informacion: InformacionFicha
    semaforo: Dict[str,Semaforo] | Semaforo
    

#---------------------------------------------------
class IndicadorMostrar(BaseModel):
    indicadorPadre: str
    indicadorhijo: str
    info: InfoIndicador
    reporte: ReporteIndicador
    
#---------------------------------------------------
#Model osolo para trerme la categorias derl indicaodr 
#ejem: CACU: [CACU 01, CACU 02, CACU 03, etc...]
class IndicesIndicadores(BaseModel):
    categoriaIndicador: str
    indicadores: list[str]
    imagen: str
    color: str

