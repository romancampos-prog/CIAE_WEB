from pydantic import BaseModel, Field, model_validator
from typing import Literal, Dict, Any
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
    MENSUAL_ACUMULADO: Dict[str, Dict[str, UnidadDatos]] | None = None
    

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
    mensual: bool = False
    mensualAcumulado: bool = False
    peridocidadGenerada: Dict[str, bool] | None = None
    periodicidad: str
    informacion: InformacionFicha
    semaforo: Dict[str,Semaforo] | Semaforo

    @model_validator(mode="before")
    @classmethod
    def _desde_peridocidadGenerada(cls, datos: Any) -> Any:
        """
        mensual/mensualAcumulado ahora viven anidados dentro de
        peridocidadGenerada en el mapeo (ver indicadores/mapeo/*.json) --
        se replican sueltos aqui para no romper a quien ya lee
        ficha.mensual / ficha.mensualAcumulado directo.
        """
        if isinstance(datos, dict):
            anidado = datos.get("peridocidadGenerada")
            if isinstance(anidado, dict):
                datos.setdefault("mensual", anidado.get("mensual", False))
                datos.setdefault("mensualAcumulado", anidado.get("mensualAcumulado", False))
        return datos
    

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

