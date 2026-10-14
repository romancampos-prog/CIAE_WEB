from fastapi import Depends, HTTPException, status, APIRouter
from auth.services.jwt_utils import solo_roles
from configs.response import ApiResponse
from services.bd_Ciae_Indicadores_Services import ConsultarGraficaIndicador

#/Indicadores/reportes
reportesApi = APIRouter()

# Cualquier usuario con sesion puede consultar las graficas (los datos ya guardados en BD_CIAE).
ROLES_CONSULTA = ("admin", "trabajador_ftp", "trabajador_IAAS", "visitante")


#Get Indicadores/reportes/{indicador}/grafica?ano=2026
@reportesApi.get("/{indicador}/grafica")
async def Grafica_Indicador(
    indicador: str,
    ano: str,
    payload: dict = Depends(solo_roles(*ROLES_CONSULTA)),
):
    """Ficha (del mapeo) + reporte (de BD_CIAE) en una sola consulta; el modulo lo resuelve el backend."""
    grafica = ConsultarGraficaIndicador(indicador, ano)
    if grafica is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No se encontró el indicador: {indicador}")
    return ApiResponse(success=True, message="Datos de la gráfica", data=grafica)
