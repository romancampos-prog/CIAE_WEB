import logging
import json
from functools import lru_cache
from pathlib import Path

#mis archivos
import indicadores
from indicadores.schemas.model.indicador_Model import IndicesIndicadores
from schemas.DTO.Indicador_ViewModel import IndicadorRequest
from schemas.model.indicador_Model import InfoIndicador
from indicadores.schemas.model.ficha_tecnica_Model import FichaTecnicaCompleta, ReporteFicha, FuenteCalculo
# Mismo modulo con el que FTP hace isinstance de las fuentes (si se importara por otra ruta seria otra clase).
from schemas.model.reporte_mapeo_Model import FichaFTPMapeo, IndicadorFTPMapeo, IndicadorIAASMapeo
from shared.semaforo_service import es_agrupado
from shared.UNIDADES import UNIDAD_TIPO_IAAS01



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

    # Semaforo agrupado (hoy solo IAAS 01, por tipo de hospital) -- el front necesita
    # saber a que grupo pertenece cada unidad para pintar el umbral que le toca.
    # es_agrupado necesita el dict CRUDO (fichaIndicador.semaforo ya viene tipado a
    # Semaforo, sus valores dejaron de ser dict). UNIDAD_TIPO_IAAS01 es el unico
    # catalogo de grupos que existe por ahora; si algun dia otro indicador usa un
    # semaforo agrupado con otras unidades, esto hay que generalizarlo a un catalogo
    # por indicador.
    if es_agrupado(datoIndicadorJson.get("semaforo", {})):
        fichaIndicador.grupoDeUnidad = UNIDAD_TIPO_IAAS01

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


#-----------------------------------------------------------------------------------------------------------------------------------------------------#
# Mapeo tipado para los indicadores de FTP (ficha y lo que necesita la extraccion)

def ruta_familia(indicador: str) -> Path:
    """indicadores/mapeo/{familia}.json de un indicador ("CAMA 01" -> CAMA.json)."""
    return _RUTA_MAPEO / f"{indicador.split()[0]}.json"


def _bloque_crudo(indicador: str) -> dict:
    with open(ruta_familia(indicador), encoding="utf-8") as archivo:
        return json.load(archivo)[indicador]


def cargar_ficha_ftp(indicador: str) -> FichaFTPMapeo:
    """Titulo, semaforo, periodicidad y nombre de archivo de un indicador FTP."""
    return FichaFTPMapeo.model_validate(_bloque_crudo(indicador))


def cargar_indicador_mapeo(indicador: str) -> IndicadorFTPMapeo:
    """Lo que necesita la extraccion de un indicador FTP: reportes, formulas y semaforo."""
    return IndicadorFTPMapeo.model_validate(_bloque_crudo(indicador))


#-----------------------------------------------------------------------------------------------------------------------------------------------------#
# Mapeo tipado para los indicadores de IAAS

@lru_cache(maxsize=None)
def cargar_mapeo_iaas() -> dict[str, IndicadorIAASMapeo]:
    """Los 6 indicadores IAAS del mapeo (se lee una sola vez)."""
    with open(_RUTA_MAPEO / "IAAS.json", encoding="utf-8") as archivo:
        crudo = json.load(archivo)
    return {indicador: IndicadorIAASMapeo.model_validate(dato) for indicador, dato in crudo.items()}


def cargar_indicador_iaas(indicador: str) -> IndicadorIAASMapeo:
    return cargar_mapeo_iaas()[indicador]
