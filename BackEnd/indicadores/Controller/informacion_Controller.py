from fastapi import APIRouter, HTTPException, status
import logging
informacionApi = APIRouter()

@informacionApi.get("Visual")
def InformacionVisual_All_Imdiocadores():
    try:
        return 0
    
    except Exception as error:
        #print para el desarrolador 
        logging.exception(f"Ocurrio un Error al Consultar el Indicador: {error}", exc_info=True)
        #Mensaje para el Usuario
        raise HTTPException(
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail = "Error al Consultar el indicador"
        )