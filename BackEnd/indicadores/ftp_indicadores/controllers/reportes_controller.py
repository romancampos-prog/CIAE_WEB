"""
Endpoints de reportes FTP (indicadores, categoría, recálculo población).
Usado en: ftp_indicadores/__init__.py (prefix /reportes)
"""
import asyncio
import base64
import io
import json
import traceback
from typing import Optional

import xlsxwriter
from fastapi import APIRouter, Query, Depends, HTTPException, Request

from configs.response import ApiResponse
from auth.services.jwt_utils import solo_roles
from ftp_indicadores.services.ftp_service import obtenerInformacionIndicador, consultarTodosIndicadores
from ftp_indicadores.services.reporte_final import ExcelReporteFinal
from ftp_indicadores.services.reporte_categoria import preparar_datos_indicador, escribir_hoja_indicador
from ftp_indicadores.services.generar_excel import obtener_estilos_excel, _calcular_color
from ftp_indicadores.services.datos_json_service import (
    meses_con_datos as ftp_meses_con_datos,
    leer_datos_indicador,
    leer_semana_indicador,
    MESES_NOMBRES as FTP_MESES_NOMBRES,
)

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
    from fastapi import status
    if semana and payload.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a reportes semanales")

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


# ─── /FTP/datos-grafica ───────────────────────────────────────────────────────

@router.get("/FTP/datos-grafica")
async def ftp_datos_grafica(
    indicador: str = Query(...),
    anio:      str = Query(...),
    payload:   dict = Depends(solo_roles(*ROLES_FTP_GRAF))
):
    try:
        info     = obtenerInformacionIndicador(indicador)
        semaforo = info.get("semaforo", {})
        datos_json = leer_datos_indicador(indicador, anio)

        if not datos_json:
            return ApiResponse(success=True, message="Sin historial", data={"unidades": [], "meses_con_datos": [], "datos": {}})

        datos     = {}
        meses_set = set()
        unidades_set = []

        for mes_nombre, unidades_mes in datos_json.get("MESES", {}).items():
            if mes_nombre not in FTP_MESES_NOMBRES:
                continue
            idx_mes = FTP_MESES_NOMBRES.index(mes_nombre)
            mes_str = str(idx_mes + 1).zfill(2)

            for unidad, vals in unidades_mes.items():
                num = vals.get("numerador")
                den = vals.get("denominador")
                pct = vals.get("%")
                if num is None and pct is None:
                    continue
                meses_set.add(mes_str)
                color_guardado = vals.get("color")
                color = (
                    _calcular_color(pct, idx_mes, semaforo)
                    if not color_guardado or color_guardado == "Gris"
                    else color_guardado
                )
                datos.setdefault(unidad, []).append({
                    "mes":         mes_str,
                    "tasa":        float(pct) if pct is not None else 0,
                    "numerador":   float(num) if num is not None else 0,
                    "denominador": float(den) if den is not None else 0,
                    "color":       color,
                })
                if unidad not in unidades_set:
                    unidades_set.append(unidad)

        for unidad in datos:
            datos[unidad].sort(key=lambda x: x["mes"])

        meses_definitivos = set(meses_set)
        semanal_json      = leer_semana_indicador(indicador, anio)
        for mes_nombre, mes_data in semanal_json.get("MESES", {}).items():
            if mes_nombre not in FTP_MESES_NOMBRES:
                continue
            idx_mes = FTP_MESES_NOMBRES.index(mes_nombre)
            mes_str = str(idx_mes + 1).zfill(2)
            if mes_str in meses_definitivos:
                continue
            semana_num = mes_data.get("semana", 1)
            meses_set.add(mes_str)
            for unidad, vals in mes_data.items():
                if unidad == "semana" or not isinstance(vals, dict):
                    continue
                pct = vals.get("%")
                num = vals.get("numerador")
                den = vals.get("denominador")
                col = vals.get("color", "Gris")
                if unidad not in unidades_set:
                    unidades_set.append(unidad)
                datos.setdefault(unidad, []).append({
                    "mes":         mes_str,
                    "tasa":        float(pct) if pct is not None else 0,
                    "numerador":   float(num) if num is not None else 0,
                    "denominador": float(den) if den is not None else 0,
                    "color":       col,
                    "semana":      semana_num,
                })
        for unidad in datos:
            datos[unidad].sort(key=lambda x: x["mes"])

        return ApiResponse(success=True, message="Datos de gráfica obtenidos", data={
            "unidades":        unidades_set,
            "meses_con_datos": sorted(meses_set),
            "datos":           datos,
        })
    except Exception as e:
        print(f"[FTP datos-grafica] {indicador}: {e}")
        return ApiResponse(success=False, message=str(e), data={"unidades": [], "meses_con_datos": [], "datos": {}})


# ─── /recalcular-poblacion ────────────────────────────────────────────────────

@router.post("/recalcular-poblacion")
async def recalcular_poblacion(request: Request, payload: dict = Depends(solo_roles(*ROLES_FTP_FULL))):
    from ftp_indicadores.services.recalcular_poblacion_service import actualizar_historico_con_nueva_poblacion

    body = await request.json()
    ano  = str(body.get("ano", "2026"))

    todos        = consultarTodosIndicadores()
    recalculados = []
    errores      = []

    for categoria, cat_data in todos.items():
        for indicador in cat_data.get("indicadores", []):
            info     = obtenerInformacionIndicador(indicador)
            reportes = info.get("reporte", {}) if isinstance(info, dict) else {}

            usa_poblacion = any(
                isinstance(v, dict) and v.get("modo") == "JSON_POBLACION"
                for v in reportes.values()
            )
            if not usa_poblacion:
                continue

            try:
                ok, detalle, n_meses = actualizar_historico_con_nueva_poblacion(indicador, ano, info)
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

@router.post("/generar-categoria")
async def generar_categoria(request: Request, payload: dict = Depends(solo_roles(*ROLES_FTP_FULL))):
    body      = await request.json()
    categoria = body.get("categoria", "").strip()
    ano       = body.get("ano", "").strip()
    mes       = body.get("mes", "").strip()
    semana    = body.get("semana")

    if not all([categoria, ano, mes]):
        raise HTTPException(status_code=400, detail="Faltan parámetros: categoria, ano, mes")

    todos    = consultarTodosIndicadores()
    cat_data = todos.get(categoria)
    if not cat_data:
        raise HTTPException(status_code=404, detail=f"Categoría '{categoria}' no encontrada")

    indicadores = cat_data.get("indicadores", [])
    if not indicadores:
        raise HTTPException(status_code=404, detail="No hay indicadores habilitados en esta categoría")

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
    nombre    = f"{categoria}_{ano}_{mes_fmt}_S{semana}.xlsx" if es_semana else f"{categoria}_{ano}_{mes_fmt}.xlsx"

    return ApiResponse(success=True, message="Categoría generada", data={
        "archivo_b64":    excel_b64,
        "nombre_archivo": nombre,
        "completados":    completados,
        "errores":        errores,
        "restricciones":  restricciones,
    })
