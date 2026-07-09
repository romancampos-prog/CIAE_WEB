"""
Consulta información e indicadores desde el FTP.
Usado en: ftp_indicadores/__init__.py (prefix /ftp)
"""
from fastapi import APIRouter, Query, Depends
from auth.services.jwt_utils import verificar_token, solo_roles
from ftp_indicadores.services.ftp_service import obtenerInformacionIndicador, consultarTodosIndicadores
from configs.response import ApiResponse

router = APIRouter()

ROLES_FTP_GRAFICA = ("admin", "trabajador_ftp", "trabajador_IAAS", "visitante")
ROLES_FTP_FULL    = ("admin", "trabajador_ftp")


@router.get("/informacion")
async def info_indicador(
    indicador: str = Query(...),
    payload:   dict = Depends(solo_roles(*ROLES_FTP_GRAFICA))
):
    resultado = obtenerInformacionIndicador(indicador)
    return ApiResponse(
        success=True,
        message=f"Información obtenida del indicador {indicador}",
        data=resultado
    )


@router.get("/todos")
async def lista_indicadores(payload: dict = Depends(solo_roles(*ROLES_FTP_GRAFICA))):
    resultado = consultarTodosIndicadores()
    return ApiResponse(
        success=True,
        message="Indicadores obtenidos exitosamente",
        data=resultado
    )
