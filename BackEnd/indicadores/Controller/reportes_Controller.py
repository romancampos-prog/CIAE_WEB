"""
/Indicadores/reportes: lo guardado en BD_CIAE para las graficas (cualquier usuario con sesion).
"""
from fastapi import APIRouter, Depends, HTTPException, status

from auth.services.jwt_utils import solo_roles
from configs.response import ApiResponse
from services.bd_Ciae_Indicadores_Services import consultar_grafica_indicador

reportesApi = APIRouter()

ROLES_CONSULTA = ("admin", "trabajador_ftp", "trabajador_IAAS", "visitante")


#Get Indicadores/reportes/{indicador}/grafica?ano=2026  (ficha + reporte + estadisticas; el modulo lo resuelve el backend)
@reportesApi.get("/{indicador}/grafica")
async def grafica_indicador(indicador: str, ano: str, payload: dict = Depends(solo_roles(*ROLES_CONSULTA))):
    grafica = consultar_grafica_indicador(indicador, ano)
    if grafica is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No se encontró el indicador: {indicador}")
    return ApiResponse(success=True, message="Datos de la gráfica", data=grafica)
