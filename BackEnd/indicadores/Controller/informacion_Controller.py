from fastapi import APIRouter, HTTPException, status
import logging
informacionApi = APIRouter()

#mis archivos
from indicadores.services.indicadorMapeo_Services import AllIndicadores
from schemas.DTO.Indicador_ViewModel import IndicadorRequest
from indicadores.services.indicadorMapeo_Services import ObtenerFichaPorIndicador, ObtenerFichaTecnicaCompleta
from indicadores.schemas.model.ficha_tecnica_Model import FichaTecnicaCompleta


@informacionApi.get("/AllIndicadores")
def IndiceIndicadores(campo: str = "mostrarGrafica", modulo: str | None = None):
    try:
        indice_indicadores = AllIndicadores(campo, modulo)
        if (not indice_indicadores):
            raise HTTPException(
                status_code = status.HTTP_400_BAD_REQUEST,
                detail = "No se encontraron indicadores"
            )
            
        return indice_indicadores
    
    except Exception as error:
        #print para el desarrolador 
        logging.exception(f"Ocurrio un Error al Consultar el indice de Indicador: {error}", exc_info=True)
        #Mensaje para el Usuario
        raise HTTPException(
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail = "Error al Consultar el indice de indicador"
        )


@informacionApi.get("/ficha/{indicador}")
def FichaIndicador(
    indicador: str,
    ano: str,
    modulo: str | None = None,
    previos: bool = False,
    mensual: bool = False,
    mensualAcumulado: bool = False,
):
    payload = IndicadorRequest(
        indicador=indicador, ano=ano, modulo=modulo,
        previos=previos, mensual=mensual, mensualAcumulado=mensualAcumulado,
    )
    try:
        
        if (not payload.indicador or not payload):
            raise HTTPException (
                status_code = status.HTTP_400_BAD_REQUEST,
                detail = "El Campo Indicador viene vacio"
            )
            
        ficha_indicador = ObtenerFichaPorIndicador(payload)
        
        return ficha_indicador
    
    except Exception as error:
        #print para el desarrolador
        logging.exception(f"Ocurrio un Error al Consultar el Indicador: {error}", exc_info=True)
        #Mensaje para el Usuario
        raise HTTPException(
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail = "Error al Consultar el indicador"
        )


@informacionApi.get("/ficha-tecnica/{indicador}", response_model=FichaTecnicaCompleta)
def FichaTecnicaCompletaIndicador(indicador: str):
    """
    Ficha técnica completa de un indicador (título/objetivo/semáforo + cómo
    se calcula) -- usada por el componente compartido FichaTecnicaBoton en
    las páginas de generar de FTP, IAAS y Extractor. Lee directo del mapeo
    unificado (indicadores/mapeo/), ya no del mapeo viejo por módulo.
    """
    try:
        ficha = ObtenerFichaTecnicaCompleta(indicador)
        if not ficha:
            raise HTTPException(
                status_code = status.HTTP_404_NOT_FOUND,
                detail = f"No se encontró el indicador: {indicador}"
            )
        return ficha

    except HTTPException:
        raise
    except Exception as error:
        logging.exception(f"Ocurrio un Error al Consultar la ficha tecnica del Indicador: {error}", exc_info=True)
        raise HTTPException(
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail = "Error al Consultar la ficha técnica del indicador"
        )