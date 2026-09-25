"""
Endpoints de reportes FTP (indicadores, categoría, recálculo población).
Usado en: ftp/__init__.py (prefix /reportes)
"""
import asyncio
import base64
import io
from typing import Optional

import xlsxwriter
from fastapi import APIRouter, Query, Depends, HTTPException, Request

from configs.response import ApiResponse
from auth.services.jwt_utils import solo_roles
from auth.services.auth_service import verificar_credenciales
from services.indicadorMapeo_Services import AllIndicadores
from ftp.services.recalcular_poblacion_service import actualizar_historico_con_nueva_poblacion, usa_poblacion
from ftp.services.reporte_final import ExcelReporteFinal
from ftp.services.reporte_categoria import (
    preparar_datos_indicador, escribir_hoja_indicador,
)
from ftp.services.generar_excel import obtener_estilos_excel
from ftp.services.datos_json_service import meses_con_datos as ftp_meses_con_datos

router = APIRouter()

ROLES_FTP_FULL = ("admin", "trabajador_ftp")
ROLES_TODOS    = ("admin", "trabajador_ftp", "trabajador_IAAS", "visitante")
ROLES_FTP_GRAF = ROLES_TODOS


# ─── /meses-generados ────────────────────────────────────────────────────────

@router.get("/meses-generados")
async def meses_generados(
    indicador: str = Query(...),
    ano:       str = Query(...),
    payload:   dict = Depends(solo_roles(*ROLES_FTP_FULL))
):
    meses = ftp_meses_con_datos(indicador, ano)
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
    resultado = ExcelReporteFinal(indicador, ano, mes, semana)

    if resultado["status"] == "success":
        archivo_buffer = resultado["stream"]
        excel_b64      = base64.b64encode(archivo_buffer.getvalue()).decode("utf-8")
        return ApiResponse(success=True, message=resultado.get("mensaje", "Reporte generado"), data={
            "archivo_b64":    excel_b64,
            "nombre_archivo": resultado["nombre_archivo"],
            "datos_grafica":  resultado.get("graficar", {}),
            "restricciones":  resultado.get("restricciones", {}),
        })
    else:
        return ApiResponse(success=False, message=resultado.get("mensaje", "Error desconocido"), data={
            "restricciones": resultado.get("restricciones"),
        })


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

    resultado = ExcelReporteFinal(indicador, ano, mes, None)

    if resultado["status"] == "success":
        archivo_buffer = resultado["stream"]
        excel_b64      = base64.b64encode(archivo_buffer.getvalue()).decode("utf-8")
        return ApiResponse(success=True, message=resultado.get("mensaje", "Reporte regenerado"), data={
            "archivo_b64":    excel_b64,
            "nombre_archivo": resultado["nombre_archivo"],
            "datos_grafica":  resultado.get("graficar", {}),
            "restricciones":  resultado.get("restricciones", {}),
        })
    else:
        return ApiResponse(success=False, message=resultado.get("mensaje", "Error desconocido"), data={
            "restricciones": resultado.get("restricciones"),
        })


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

async def _generar_categoria_excel(categoria: str, ano: str, mes: str, semana):
    """Arma el Excel con una pestaña por indicador de la categoría. Compartido
    por /generar-categoria (primera generación) y /generar-categoria/regenerar
    (mes definitivo ya generado, requiere contraseña)."""
    cat_data = next((c for c in AllIndicadores("mostrarGenerar", "ftp") if c.categoriaIndicador == categoria), None)
    if not cat_data:
        raise HTTPException(status_code=404, detail=f"Categoría '{categoria}' no encontrada")

    indicadores = cat_data.indicadores

    es_semana = bool(semana and str(semana).strip() not in ("", "None", "none"))
    loop      = asyncio.get_running_loop()

    pares = []
    for ind in indicadores:
        resultado = await loop.run_in_executor(None, preparar_datos_indicador, ind, ano, mes, semana)
        pares.append((ind, resultado))

    output = io.BytesIO()
    wb     = xlsxwriter.Workbook(output)
    wb.set_properties({'author': 'Web CIAE'})
    fmt    = obtener_estilos_excel(wb)

    completados   = []
    errores       = {}
    restricciones = {}

    for indicador, resultado in pares:
        if resultado["status"] != "success":
            errores[indicador] = resultado.get("mensaje", "Error desconocido")
            continue
        try:
            escribir_hoja_indicador(
                wb, fmt, indicador,
                resultado["diccionarioPrevio"],
                resultado["metadata"],
                ano, mes, semana, es_semana
            )
            completados.append(indicador)
            log_ftp = resultado.get("errores") or {}
            if log_ftp:
                errores[indicador] = log_ftp
                for tipo, val in log_ftp.items():
                    if tipo not in restricciones:
                        restricciones[tipo] = {
                            "nombreError":      val["nombreError"],
                            "descripcionError": val["descripcionError"],
                            "unidades":         {},
                        }
                    for unidad, paths in val.get("unidades", {}).items():
                        clave = f"{indicador} / {unidad}"
                        restricciones[tipo]["unidades"][clave] = paths
        except Exception as exc:
            errores[indicador] = str(exc)

    wb.close()

    if not completados:
        return ApiResponse(success=False, message="Ningún indicador pudo generarse", data={"errores": errores})

    output.seek(0)
    excel_b64 = base64.b64encode(output.getvalue()).decode("utf-8")
    mes_fmt   = str(mes).zfill(2)
    # La semana ya va marcada en el nombre de cada pestaña (ver escribir_hoja_indicador),
    # así que el nombre del archivo no la necesita.
    nombre    = f"{categoria}_{ano}_{mes_fmt}.xlsx"

    return ApiResponse(success=True, message="Categoría generada", data={
        "archivo_b64":    excel_b64,
        "nombre_archivo": nombre,
        "completados":    completados,
        "errores":        errores,
        "restricciones":  restricciones,
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

    return await _generar_categoria_excel(categoria, ano, mes, semana)


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

    return await _generar_categoria_excel(categoria, ano, mes, None)
