from fastapi import APIRouter, Depends

from auth.services.jwt_Services import solo_roles
from configs.response import ApiResponse
from ..services.ftp.ftpExtraer import ftp_Extraer_Epidemeologia

ftpApi = APIRouter()


#Post epidemiologia/ftp/extraer/OC30  (semana vacia = definitivo del mes)
@ftpApi.post("/extraer/OC30")
def ftpExtraer(ano: int, mes: int, semana: int | None = None, payload: dict = Depends(solo_roles("admin"))):
    archivo: str = "AccionesOC30"
    mensaje, datos = ftp_Extraer_Epidemeologia(ano, mes, semana, archivo)
    return ApiResponse(success=True, message=mensaje, data=datos)
