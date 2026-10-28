
from fastapi import APIRouter, Depends

from auth.services.jwt_Services import solo_roles
from configs.response import ApiResponse
from ..services.ftp.consulta_extraccion_Services import consultar_extraccion
from ..services.ftp.ftpExtraer import ftp_Extraer_Epidemeologia
from ..services.ftp.periodos_extraccion_Services import periodos_de_extraccion

ftpApi = APIRouter()

# "unidad" = usuario de un hospital/UMF: solo ve las filas de su unidad (los nombres vienen en el token).
ROLES_CONSULTA = ("admin", "unidad")


#Post epidemiologia/ftp/extraer/OC30  (semana vacia = definitivo del mes)
@ftpApi.post("/extraer/OC30")
def ftpExtraer(ano: int, mes: int, semana: int | None = None, payload: dict = Depends(solo_roles("admin"))):
    archivo: str = "AccionesOC30"
    mensaje, datos = ftp_Extraer_Epidemeologia(ano, mes, semana, archivo)
    return ApiResponse(success=True, message=mensaje, data=datos)


##--------------------------------------

#Get epidemiologia/ftp/extraccion/OC30?ano=2026&mes=9  (definitivo del mes o, si aun no hay, su ultima semana)
@ftpApi.get("/extraccion/OC30")
def ftpConsultar(ano: int, mes: int, payload: dict = Depends(solo_roles(*ROLES_CONSULTA))):
    archivo: str = "AccionesOC30"
    unidades_usuario = payload.get("unidades", []) if payload.get("rol") == "unidad" else None
    mensaje, datos = consultar_extraccion(ano, mes, archivo, unidades_usuario, payload.get("rol") == "admin")
    return ApiResponse(success=True, message=mensaje, data=datos)


##--------------------------------------

#Get epidemiologia/ftp/extraccion/OC30/periodos?ano=2026  (meses con extraccion: definitivo o ultima semana)
@ftpApi.get("/extraccion/OC30/periodos")
def ftpPeriodos(ano: int, payload: dict = Depends(solo_roles(*ROLES_CONSULTA))):
    archivo: str = "AccionesOC30"
    mensaje, datos = periodos_de_extraccion(ano, archivo)
    return ApiResponse(success=True, message=mensaje, data=datos)
