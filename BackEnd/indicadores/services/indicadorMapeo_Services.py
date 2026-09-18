import logging
import json
from pathlib import Path

#mis archivos
import indicadores
from indicadores.schemas.model.indicador_Model import IndicesIndicadores
from schemas.DTO.Indicador_ViewModel import IndicadorRequest
from schemas.model.indicador_Model import InfoIndicador
from indicadores.schemas.model.ficha_tecnica_Model import FichaTecnicaCompleta, ReporteFicha, FuenteCalculo



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

def AllIndicadores(campo: str = "mostrarGrafica", modulo: str | None = None) -> list[IndicesIndicadores]:
    """
    campo: bandera del mapeo que decide que indicadores se listan -- "mostrarGrafica"
           (gráficas/descargas, default) o "mostrarGenerar" (páginas de Generar).
    modulo: si se manda ("ftp", "iaas", "Extractor"), solo los indicadores de ese módulo
            (un indicador sin módulo asignado todavía no está automatizado).
    Las categorías que quedan sin indicadores no se incluyen.
    """
    #en la caporeta extarer nombre del idnciador y gacer arreglo 
    
    
    if(_RUTA_MAPEO.exists() == False):
        logging.error(f"La ruta de mapeo de indicadores no existe: {_RUTA_MAPEO}")
        raise FileNotFoundError(f"La ruta de mapeo de indicadores no existe: {_RUTA_MAPEO}")
    
    # POBLACION.json no es una familia de indicadores -- es la config de columnas
    # del Excel de población, se excluye del glob.
    categoriaIndicadores = [archivo.stem for archivo in _RUTA_MAPEO.glob("*.json") if archivo.stem != "POBLACION"]
    
    indicesIndicadores = []
    
    for categoria in categoriaIndicadores:
        #leer el archivo json
        rutaArchivo = _RUTA_MAPEO / f"{categoria}.json"
        with open(rutaArchivo, "r", encoding="utf-8") as archivo:
            data = json.load(archivo)
        
        indicadores = []
        imagen = ""
        color = ""
        #extraer los indicadores del json
        for indicador, info in data.items():
            if info.get(campo, True) and (modulo is None or str(info.get("modulo", "")).lower() == modulo.lower()):
                indicadores.append(indicador)
            if not imagen:
                imagen = info.get("imagen", "")
            if not color:
                color = info.get("color", "")


        #crear objeto IndicesIndicadores
        if not indicadores:
            continue

        indice = IndicesIndicadores(
            categoriaIndicador=categoria,
            indicadores=indicadores,
            imagen=imagen,
            color=color
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

#-----------------------------------------------------------------------------------------------------------------------------------------------------#

def ObtenerFichaTecnicaCompleta(indicador: str) -> FichaTecnicaCompleta | None:
    """
    Ficha técnica completa (para el panel compartido FichaTecnicaBoton, usado
    en FTP/IAAS/Extractor): igual que ObtenerFichaPorIndicador pero además
    incluye reporte.numerador/denominador/operacion -- lo que necesita la
    pestaña "Cálculo" para explicar cómo se saca el indicador.
    reporte queda en None cuando el indicador no está automatizado todavía
    (mostrarGenerar=false, ej. CACU 02 -- su bloque "reporte" viene vacío {}
    en el mapeo).
    """
    rutaMapeoIndicador = RutaMapeoExiste(indicador)
    if not rutaMapeoIndicador:
        return None

    with open(rutaMapeoIndicador, "r", encoding="utf-8") as archivo:
        data = json.load(archivo)

    dato = data.get(indicador)
    if not dato:
        return None

    repCrudo = dato.get("reporte") or {}
    reporte = None
    if repCrudo:
        num = repCrudo["numerador"]
        den = repCrudo["denominador"]
        reporte = ReporteFicha(
            numerador=FuenteCalculo(fuente=num.get("fuente", ""), modoExtraccion=num.get("modoExtraccion"), detalle=num),
            denominador=FuenteCalculo(fuente=den.get("fuente", ""), modoExtraccion=den.get("modoExtraccion"), detalle=den),
            operacion=repCrudo["operacion"],
        )

    return FichaTecnicaCompleta(
        modulo=dato.get("modulo", ""),
        fechaModificacion=dato["fechaModificacion"],
        periodicidad=dato["periodicidad"],
        automatizado=bool(repCrudo),
        informacion=dato["informacion"],
        reporte=reporte,
        semaforo=dato["semaforo"],
    )

