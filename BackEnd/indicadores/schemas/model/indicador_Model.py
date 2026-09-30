from pydantic import BaseModel, Field, model_validator
from typing import Literal, Dict, Any
from shared.PERIODICIDAD import PERIODICIDAD
from shared.reglas_periodicidad import descripcion_periodicidad


class UnidadDatos(BaseModel):
    numerador:   float | None = None
    denominador: float | None = None
    desempeno:   Literal["Esperado", "Medio", "Bajo", "Gris"]
    resultado:   float | None = Field(None, alias = "%")


class MesReporte(BaseModel):
    """
    Un mes (o corte) ya guardado: el reporte por unidad, mas con que poblacion
    se calculo (None si el indicador no depende de poblacion, o si no se pudo
    detectar el mes/año del archivo subido). Poblacion queda fija en el momento
    en que ese mes se guarda -- no cambia sola despues aunque se suba una
    poblacion mas nueva, salvo que ese mes se vuelva a calcular.
    """
    Poblacion: str | None = None
    Reporte:   Dict[str, UnidadDatos]


class ReportePrevio(BaseModel):
    SEMANA: int
    MES:    Dict[str, MesReporte]



class ReporteIndicador(BaseModel):
    INDICADOR:    str
    ANIO:         int
    MESES:        Dict[str, MesReporte]
    SEMANA:       ReportePrevio | None = None
    MENSUAL_ACUMULADO: Dict[str, MesReporte] | None = None
    

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
    descripcionPeriodicidad: str | None = None
    informacion: InformacionFicha
    semaforo: Dict[str,Semaforo] | Semaforo
    # Solo cuando el semaforo esta agrupado (ej. IAAS 01: por tipo de hospital) --
    # {unidad: nombre del grupo, ej. "HGS"} para que el front sepa que bloque de
    # umbrales le toca a cada unidad. None si el semaforo no esta agrupado.
    grupoDeUnidad: Dict[str, str] | None = None

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
            datos.setdefault("descripcionPeriodicidad", descripcion_periodicidad(datos.get("periodicidad")))
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

