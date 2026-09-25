from fastapi import APIRouter, Depends, HTTPException, Query
import asyncio

#mis archivos
from auth.services.auth_service import verificar_credenciales
from auth.services.jwt_utils import solo_roles
from configs.response import ApiResponse
from schemas.DTO.generacion_ftp_ViewModel import (
    GenerarCategoriaRequest, GenerarIndicadorRequest, GeneracionCategoriaResponse,
    GeneracionIndicadorResponse, MesesGeneradosResponse, RegenerarCategoriaRequest, RegenerarIndicadorRequest,
)
from schemas.model.generacion_ftp_Model import ResultadoGeneracion
from services.bd_Ciae_Guardado_Services import meses_con_datos
from services.indicadorMapeo_Services import AllIndicadores
from services.ftp.generacion_indicador_ftp_Services import consolidar_categoria, generar_indicador_ftp

#/Indicadores/ftp  (GENERACION MEDIANTE EXTRACCION DE FTP: al terminar queda guardado en BD_CIAE;
#el Excel se pide aparte a /Indicadores/excel)
ftpApi = APIRouter()

ROLES_FTP_FULL = ("admin", "trabajador_ftp")


def _exigir_contrasena(payload: dict, password: str) -> None:
    """Regenerar sobrescribe datos ya guardados, asi que se pide de nuevo la contrasena del usuario."""
    if not verificar_credenciales(payload.get("sub"), password):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")


async def _generar_un_indicador(indicador: str, ano: str, mes: str, semana: str | None, mensaje: str) -> ApiResponse:
    # La extraccion baja archivos del FTP: va en un hilo para no bloquear el servidor.
    resultado: ResultadoGeneracion = await asyncio.to_thread(generar_indicador_ftp, indicador, ano, mes, semana)
    return ApiResponse(
        success=True, message=f"Reporte {indicador} {mensaje}",
        data=GeneracionIndicadorResponse(restricciones=resultado.errores).model_dump(),
    )


async def _generar_categoria(categoria: str, ano: str, mes: str, semana: str | None) -> ApiResponse:
    """Genera todos los indicadores de la categoria, uno tras otro. Compartido por generar y regenerar."""
    categoria_ftp = next((c for c in AllIndicadores("mostrarGenerar", "ftp") if c.categoriaIndicador == categoria), None)
    if not categoria_ftp:
        raise HTTPException(status_code=404, detail=f"Categoría '{categoria}' no encontrada")

    resultados: dict[str, ResultadoGeneracion | str] = {}
    for indicador in categoria_ftp.indicadores:
        try:
            resultados[indicador] = await asyncio.to_thread(generar_indicador_ftp, indicador, ano, mes, semana)
        except Exception as error:
            resultados[indicador] = str(error)

    generada = consolidar_categoria(resultados)
    if not generada.completados:
        return ApiResponse(success=False, message="Ningún indicador pudo generarse", data={"errores": generada.errores})

    return ApiResponse(
        success=True, message="Categoría generada",
        data=GeneracionCategoriaResponse(
            completados=generada.completados, errores=generada.errores, restricciones=generada.restricciones,
        ).model_dump(),
    )


#Get Indicadores/ftp/meses-generados?indicador=CAMA 01&ano=2026
@ftpApi.get("/meses-generados")
async def MesesGenerados(
    indicador: str = Query(...),
    ano: str = Query(...),
    payload: dict = Depends(solo_roles(*ROLES_FTP_FULL)),
):
    return ApiResponse(
        success=True, message="Meses con datos obtenidos",
        data=MesesGeneradosResponse(meses=meses_con_datos(indicador, ano)).model_dump(),
    )


#Get Indicadores/ftp/generar?indicador=CAMA 01&ano=2026&mes=07&semana=3 (semana es opcional)
@ftpApi.get("/generar")
async def GenerarIndicador(
    solicitud: GenerarIndicadorRequest = Depends(),
    payload: dict = Depends(solo_roles(*ROLES_FTP_FULL)),
):
    # ROLES_FTP_FULL = ("admin", "trabajador_ftp") -- ambos pueden generar previos y definitivos por igual.
    return await _generar_un_indicador(solicitud.indicador, solicitud.ano, solicitud.mes, solicitud.semana, "generado correctamente")


#Post Indicadores/ftp/regenerar  (mes definitivo que ya estaba generado; exige contrasena)
@ftpApi.post("/regenerar")
async def RegenerarIndicador(
    solicitud: RegenerarIndicadorRequest,
    payload: dict = Depends(solo_roles(*ROLES_FTP_FULL)),
):
    _exigir_contrasena(payload, solicitud.password)
    return await _generar_un_indicador(solicitud.indicador, solicitud.ano, solicitud.mes, None, "regenerado correctamente")


#Post Indicadores/ftp/generar-categoria
@ftpApi.post("/generar-categoria")
async def GenerarCategoria(
    solicitud: GenerarCategoriaRequest,
    payload: dict = Depends(solo_roles(*ROLES_FTP_FULL)),
):
    return await _generar_categoria(solicitud.categoria, solicitud.ano, solicitud.mes, solicitud.semana)


#Post Indicadores/ftp/regenerar-categoria  (mes definitivo que la categoria ya tenia generado; exige contrasena)
@ftpApi.post("/regenerar-categoria")
async def RegenerarCategoria(
    solicitud: RegenerarCategoriaRequest,
    payload: dict = Depends(solo_roles(*ROLES_FTP_FULL)),
):
    _exigir_contrasena(payload, solicitud.password)
    return await _generar_categoria(solicitud.categoria, solicitud.ano, solicitud.mes, None)
