from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
import asyncio

#mis archivos
from auth.services.auth_service import verificar_credenciales
from auth.services.jwt_utils import solo_roles
from configs.response import ApiResponse
from schemas.DTO.generacion_ftp_ViewModel import (
    GenerarCategoriaRequest, GenerarIndicadorRequest, GeneracionCategoriaResponse,
    GeneracionIndicadorResponse, MesesGeneradosResponse, RecalcularPoblacionRequest,
    RegenerarCategoriaRequest, RegenerarIndicadorRequest,
)
from schemas.model.generacion_ftp_Model import ResultadoGeneracion
from schemas.model.poblacion_ftp_Model import (
    IndicadorRecalculado, ResultadoCargaPoblacion, ResultadoRecalculoPoblacion,
)
from shared.auditoria_service import registrar
from shared.validarArchivo_service import validarPeso_Archivo
from services.bd_Ciae_Guardado_Services import meses_con_datos
from services.indicadorMapeo_Services import AllIndicadores
from services.ftp.generacion_indicador_ftp_Services import consolidar_categoria, generar_indicador_ftp
from services.poblacion_Services import leer_periodo_poblacion, obtener_ultimo_archivo_poblacion, procesar_archivo_poblacion
from services.ftp.recalcular_poblacion_ftp_Services import actualizar_historico_con_nueva_poblacion, usa_poblacion

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


#Get Indicadores/ftp/poblacion/archivo-actual?anio=2026
@ftpApi.get("/poblacion/archivo-actual")
async def ArchivoPoblacionActual(
    anio: str | None = None,
    payload: dict = Depends(solo_roles("admin", "trabajador_ftp", "trabajador_IAAS", "visitante")),
):
    mes_detectado, anio_detectado = leer_periodo_poblacion(anio)
    return ApiResponse(
        success=True, message="Archivo de población actual",
        data={
            "nombre_sin_ext": obtener_ultimo_archivo_poblacion(anio),
            "mes_detectado":  mes_detectado,
            "anio_detectado": anio_detectado,
        },
    )


#Post Indicadores/ftp/poblacion/subir
@ftpApi.post("/poblacion/subir")
async def SubirPoblacion(
    archivo:     UploadFile   = File(...),
    pesoArchivo: int          = Form(...),
    anio:        str | None   = Form(None),
    payload:     dict         = Depends(solo_roles(*ROLES_FTP_FULL)),
):
    if not archivo.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos Excel (.xlsx, .xls)")

    contenido = await archivo.read()
    if not validarPeso_Archivo(contenido, pesoArchivo):
        raise HTTPException(status_code=413, detail="Archivo demasiado grande o tamaño inconsistente")

    resultado = procesar_archivo_poblacion(contenido, archivo.filename, anio)
    if not resultado["ok"]:
        raise HTTPException(status_code=422, detail=resultado["detalle"])

    registrar("SUBIDA_ARCHIVO", usuario=payload.get("sub"), detalle=f"archivo=poblacion({archivo.filename}) bytes={len(contenido)}")
    return ApiResponse(success=True, message=resultado["detalle"], data=ResultadoCargaPoblacion(**resultado).model_dump())


#Post Indicadores/ftp/recalcular-poblacion
@ftpApi.post("/recalcular-poblacion")
async def RecalcularPoblacion(
    solicitud: RecalcularPoblacionRequest,
    payload: dict = Depends(solo_roles(*ROLES_FTP_FULL)),
):
    recalculados: list[IndicadorRecalculado] = []
    errores: list[str] = []

    for categoria in AllIndicadores("mostrarGenerar", "ftp"):
        for indicador in categoria.indicadores:
            try:
                if not usa_poblacion(indicador):
                    continue
                ok, detalle, n_meses = actualizar_historico_con_nueva_poblacion(indicador, solicitud.ano)
                if ok:
                    recalculados.append(IndicadorRecalculado(indicador=indicador, meses=n_meses, detalle=detalle))
                else:
                    errores.append(f"{indicador}: {detalle}")
            except Exception as error:
                errores.append(f"{indicador}: {str(error)}")

    resultado = ResultadoRecalculoPoblacion(
        total=sum(r.meses for r in recalculados), recalculados=recalculados, errores=errores,
    )
    return ApiResponse(success=True, message="Recálculo completado", data=resultado.model_dump())
