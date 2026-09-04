from fastapi import APIRouter, HTTPException, status
import logging
informacionApi = APIRouter()

#mis archivos
from indicadores.services.indicadorMapeo_Services import AllIndicadores
from schemas.DTO.Indicador_ViewModel import IndicadorRequest
from indicadores.services.indicadorMapeo_Services import ObtenerFichaPorIndicador


@informacionApi.get("/AllIndicadores")
def IndiceIndicadores():
    try:
        indice_indicadores = AllIndicadores()
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
def FichaIndicador(payload: IndicadorRequest):
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