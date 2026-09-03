from fastapi import HTTPException, status, APIRouter
from configs.response import ApiResponse
from schemas.DTO.Indicador_ViewModel import IndicadorRequest
from services.bd_Ciae_Indicadores_Services import IndicadorConsultarReporte
import logging

#/Indicadores/reportes
reportesApi = APIRouter()


#Get Indicadores/reporte/Indicador)
@reportesApi.get("/Indicador/{indicador}")
async def Obtener_Indicador(payload: IndicadorRequest):
    try:
        if (not payload.indicador or not payload.ano):
            raise HTTPException (
                status_code = status.HTTP_400_BAD_REQUEST,
                detail = "El Campo Indicador o año viene vacio"
            )
        
        reporte = IndicadorConsultarReporte(payload)
        if (not reporte):
                   raise HTTPException(
                       status_code = status.HTTP_400_BAD_REQUEST,
                       detail = f"El Indicador {payload.indicador} no cuenta con reporte"
                   )
                   
        return reporte
    
    except Exception as error:
        #print para el desarrolador 
        logging.exception(f"Ocurrio un Error al Consultar el Indicador: {error}", exc_info=True)
        #Mensaje para el Usuario
        raise HTTPException(
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail = "Error al Consultar el indicador"
        )