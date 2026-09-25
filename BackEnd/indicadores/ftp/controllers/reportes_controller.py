"""
Endpoints de reportes FTP (indicadores, categoría, recálculo población).
Generar termina al guardar en BD_CIAE; el Excel se pide aparte a /Indicadores/excel.
Usado en: ftp/__init__.py (prefix /reportes)
"""
import asyncio
from typing import Optional

from fastapi import APIRouter, Query, Depends, HTTPException, Request

from configs.response import ApiResponse
from auth.services.jwt_utils import solo_roles
from auth.services.auth_service import verificar_credenciales
from schemas.model.generacion_ftp_Model import LogErrores, ResultadoGeneracion
from services.indicadorMapeo_Services import AllIndicadores
from services.bd_Ciae_Guardado_Services import meses_con_datos
from services.ftp.generacion_indicador_ftp_Services import consolidar_categoria, generar_indicador_ftp
from ftp.services.recalcular_poblacion_service import actualizar_historico_con_nueva_poblacion, usa_poblacion

router = APIRouter()

ROLES_FTP_FULL = ("admin", "trabajador_ftp")
ROLES_TODOS    = ("admin", "trabajador_ftp", "trabajador_IAAS", "visitante")
ROLES_FTP_GRAF = ROLES_TODOS


def _restricciones(errores: LogErrores) -> dict:
    return {tipo: error.model_dump() for tipo, error in errores.items()}


async def _generar_un_indicador(indicador: str, ano: str, mes: str, semana, mensaje: str) -> ApiResponse:
    # La extraccion baja archivos del FTP: va en un hilo para no bloquear el servidor.
    resultado: ResultadoGeneracion = await asyncio.to_thread(generar_indicador_ftp, indicador, ano, mes, semana)
    return ApiResponse(success=True, message=f"Reporte {indicador} {mensaje}", data={
        "restricciones": _restricciones(resultado.errores),
    })


# ─── /meses-generados ────────────────────────────────────────────────────────

@router.get("/meses-generados")
async def meses_generados(
    indicador: str = Query(...),
    ano:       str = Query(...),
    payload:   dict = Depends(solo_roles(*ROLES_FTP_FULL))
):
    meses = meses_con_datos(indicador, ano)
    return ApiResponse(success=True, message="Meses con datos obtenidos", data={"meses": meses})


# ─── /Indicadores ─────────────────────────────────────────────────────────────

@router.get("/Indicadores")
async def reporte(
    indicador: str = Query(...),
    ano:       str = Query(...),
    mes:       str = Query(...),
    semana:    Optional[str] = Query(None),
    payload:   dict = Depends(solo_roles(*ROLES_FTP_FULL))
):
    # ROLES_FTP_FULL = ("admin", "trabajador_ftp") -- ambos pueden generar previos
    # y definitivos por igual, no solo admin.
    return await _generar_un_indicador(indicador, ano, mes, semana, "generado correctamente")


# ─── /Indicadores/regenerar ────────────────────────────────────────────────────
# Regenera un mes DEFINITIVO que ya tiene reporte guardado. A diferencia del GET
# normal (primera generación), esto sobrescribe datos existentes, así que exige
# la contraseña del usuario autenticado (mismo mecanismo que IAAS/completar-unidad).

@router.post("/Indicadores/regenerar")
async def regenerar_reporte(request: Request, payload: dict = Depends(solo_roles(*ROLES_FTP_FULL))):
    body      = await request.json()
    indicador = (body.get("indicador") or "").strip()
    ano       = (body.get("ano") or "").strip()
    mes       = (body.get("mes") or "").strip()
    password  = body.get("password") or ""

    if not all([indicador, ano, mes]):
        raise HTTPException(status_code=400, detail="Faltan parámetros: indicador, ano, mes")
    if not password:
        raise HTTPException(status_code=400, detail="Ingresa tu contraseña.")

    usuario = payload.get("sub")
    if not verificar_credenciales(usuario, password):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    return await _generar_un_indicador(indicador, ano, mes, None, "regenerado correctamente")


# ─── /recalcular-poblacion ────────────────────────────────────────────────────

@router.post("/recalcular-poblacion")
async def recalcular_poblacion(request: Request, payload: dict = Depends(solo_roles(*ROLES_FTP_FULL))):
    body = await request.json()
    ano  = str(body.get("ano", "2026"))

    recalculados = []
    errores      = []

    for categoria in AllIndicadores("mostrarGenerar", "ftp"):
        for indicador in categoria.indicadores:
            try:
                if not usa_poblacion(indicador):
                    continue
                ok, detalle, n_meses = actualizar_historico_con_nueva_poblacion(indicador, ano)
                if ok:
                    recalculados.append({"indicador": indicador, "meses": n_meses, "detalle": detalle})
                else:
                    errores.append(f"{indicador}: {detalle}")
            except Exception as e:
                errores.append(f"{indicador}: {str(e)}")

    return ApiResponse(success=True, message="Recálculo completado", data={
        "total":        sum(r["meses"] for r in recalculados),
        "recalculados": recalculados,
        "errores":      errores,
    })


# ─── /generar-categoria ───────────────────────────────────────────────────────

async def _generar_categoria(categoria: str, ano: str, mes: str, semana) -> ApiResponse:
    """Genera todos los indicadores de la categoría, uno tras otro. Compartido por
    /generar-categoria (primera generación) y /generar-categoria/regenerar
    (mes definitivo ya generado, requiere contraseña)."""
    cat_data = next((c for c in AllIndicadores("mostrarGenerar", "ftp") if c.categoriaIndicador == categoria), None)
    if not cat_data:
        raise HTTPException(status_code=404, detail=f"Categoría '{categoria}' no encontrada")

    resultados: dict[str, ResultadoGeneracion | str] = {}
    for indicador in cat_data.indicadores:
        try:
            resultados[indicador] = await asyncio.to_thread(generar_indicador_ftp, indicador, ano, mes, semana)
        except Exception as error:
            resultados[indicador] = str(error)

    categoria_generada = consolidar_categoria(resultados)
    if not categoria_generada.completados:
        return ApiResponse(success=False, message="Ningún indicador pudo generarse", data={"errores": categoria_generada.errores})

    return ApiResponse(success=True, message="Categoría generada", data={
        "completados":   categoria_generada.completados,
        "errores":       {ind: (_restricciones(e) if isinstance(e, dict) else e) for ind, e in categoria_generada.errores.items()},
        "restricciones": _restricciones(categoria_generada.restricciones),
    })


@router.post("/generar-categoria")
async def generar_categoria(request: Request, payload: dict = Depends(solo_roles(*ROLES_FTP_FULL))):
    body      = await request.json()
    categoria = body.get("categoria", "").strip()
    ano       = body.get("ano", "").strip()
    mes       = body.get("mes", "").strip()
    semana    = body.get("semana")

    if not all([categoria, ano, mes]):
        raise HTTPException(status_code=400, detail="Faltan parámetros: categoria, ano, mes")

    return await _generar_categoria(categoria, ano, mes, semana)


# ─── /generar-categoria/regenerar ──────────────────────────────────────────────
# Igual que /generar-categoria pero para un mes DEFINITIVO que la categoría
# completa ya tiene generado — exige contraseña porque sobrescribe datos.

@router.post("/generar-categoria/regenerar")
async def regenerar_categoria(request: Request, payload: dict = Depends(solo_roles(*ROLES_FTP_FULL))):
    body      = await request.json()
    categoria = (body.get("categoria") or "").strip()
    ano       = (body.get("ano") or "").strip()
    mes       = (body.get("mes") or "").strip()
    password  = body.get("password") or ""

    if not all([categoria, ano, mes]):
        raise HTTPException(status_code=400, detail="Faltan parámetros: categoria, ano, mes")
    if not password:
        raise HTTPException(status_code=400, detail="Ingresa tu contraseña.")

    usuario = payload.get("sub")
    if not verificar_credenciales(usuario, password):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    return await _generar_categoria(categoria, ano, mes, None)
