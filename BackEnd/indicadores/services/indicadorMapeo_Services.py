import logging
import json
from pathlib import Path

#mis archivos
import indicadores
from indicadores.schemas.model.indicador_Model import IndicesIndicadores
from schemas.DTO.Indicador_ViewModel import IndicadorRequest
from schemas.model.indicador_Model import InfoIndicador



_RUTA_MAPEO = Path(__file__).parent.parent / "mapeo"



def RutaMapeoExiste(indicador: str) -> str:
    """
    Verifica si existe el archivo JSON de un indicador para un año dado.
    Parámetros:
        indicador: nombre de familia + número separados por espacio, ej. "CACU 01".
    Retorna:
        dict con ("encontrado": False si el archivo no existe.
        dict con {"encontrado": True, "ruta": Path} si sí existe.
    """
    
    indicadorBuscar = indicador.split()
    indicadorPadre = indicadorBuscar[0]  #CAMA
    
    if (_RUTA_MAPEO.exists() == False):
        logging.error(f"La ruta de mapeo de indicadores no existe: {_RUTA_MAPEO}")
        raise FileNotFoundError(f"La ruta de mapeo de indicadores no existe: {_RUTA_MAPEO}")
   
    rutaIndicadorMepo = f"{_RUTA_MAPEO / indicadorPadre}.json"
    
    if(not Path(rutaIndicadorMepo).exists()):
        logging.error(f"Ruta incorrecta o archivo incorrecto del indicador=  {indicador}")
        return None
    

    return rutaIndicadorMepo

#-----------------------------------------------------------------------------------------------------------------------------------------------------#

def AllIndicadores() -> list[IndicesIndicadores]:
    #en la caporeta extarer nombre del idnciador y gacer arreglo 
    
    
    if(_RUTA_MAPEO.exists() == False):
        logging.error(f"La ruta de mapeo de indicadores no existe: {_RUTA_MAPEO}")
        raise FileNotFoundError(f"La ruta de mapeo de indicadores no existe: {_RUTA_MAPEO}")
    
    categoriaIndicadores = [archivo.stem for archivo in _RUTA_MAPEO.glob("*.json")]
    
    indicesIndicadores = []
    
    for categoria in categoriaIndicadores:
        #leer el archivo json
        rutaArchivo = _RUTA_MAPEO / f"{categoria}.json"
        with open(rutaArchivo, "r", encoding="utf-8") as archivo:
            data = json.load(archivo)
        
        indicadores = []
        #extraer los indicadores del json
        for indicador, info in data.items():
            if info.get("mostrarGrafica", True):  # Solo incluir indicadores disponibles
                indicadores.append(indicador)
        
        
        #crear objeto IndicesIndicadores
        indice = IndicesIndicadores(
            categoriaIndicador=categoria,
            indicadores=indicadores
        )
        
        indicesIndicadores.append(indice)
        
    return indicesIndicadores

#-----------------------------------------------------------------------------------------------------------------------------------------------------#

def ObtenerFichaPorIndicador(payload: IndicadorRequest) -> InfoIndicador | None:
    #esta funcion es para obtener la informacion visual del indicador
    #ejem: titulo, objetivo, descripcion del numerador y denominador, semaforo, etc...
    rutaMapeoIndicador = RutaMapeoExiste(payload.indicador)
    if (not rutaMapeoIndicador): return None
    
    with open(rutaMapeoIndicador, "r", encoding="utf-8") as archivo:
        data = json.load(archivo)
        
    #extraer info del indicador solicitado 
    datoIndicadorJson = data.get(payload.indicador)
    fichaIndicador = InfoIndicador.model_validate(datoIndicadorJson)
    
    return fichaIndicador

