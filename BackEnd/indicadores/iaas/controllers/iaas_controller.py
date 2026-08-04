"""
Endpoints de consulta y actualización del módulo IAAS.
Usado en: iass/router expuesto en main.py (prefix /iass)
"""
import json
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from auth.services.jwt_utils import solo_roles
from auth.services.auth_service import verificar_credenciales
from iaas.services.info_service import (
    infoAllIAAS,
    obtenerUnidadesIAAS,
    obtenerIndicadoresIAAS,
)
from iaas.services.procesar_service import (
    completar_unidad_tardia,
    _leer_sesion_mes,
    _get_pendientes_info,
    MESES_NOMBRE,
    _ruta_sesion,
)
from iaas.services.datos_json_service import leer_indicador_anio
from configs.response import ApiResponse
from shared.validarArchivo_service import validarPeso_Archivo
from shared.auditoria_service import registrar

router = APIRouter()

ROLES_IAAS_VISTA = ("admin", "trabajador_ftp", "trabajador_IAAS", "visitante")


@router.get("/info")
async def get_info_all(payload: dict = Depends(solo_roles(*ROLES_IAAS_VISTA))):
    resultado = infoAllIAAS()
    return ApiResponse(success=True, message="Información de indicadores IAAS obtenida", data=resultado)


@router.get("/unidades")
async def get_unidades(payload: dict = Depends(solo_roles(*ROLES_IAAS_VISTA))):
    resultado = obtenerUnidadesIAAS()
    return ApiResponse(success=True, message="Unidades IAAS obtenidas", data=resultado)


@router.get("/indicadores")
async def get_indicadores(payload: dict = Depends(solo_roles(*ROLES_IAAS_VISTA))):
    resultado = obtenerIndicadoresIAAS()
    return ApiResponse(success=True, message="Indicadores IAAS obtenidos", data=resultado)


@router.get("/sesion")
async def get_sesion(
    anio: str,
    mes:  str,
    payload: dict = Depends(solo_roles(*ROLES_IAAS_VISTA)),
):
    mes_nombre = MESES_NOMBRE.get(mes, mes)
    try:
        ruta = _ruta_sesion(anio)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not ruta.exists():
        return ApiResponse(success=True, message="Sin sesión activa", data=None)

    pendientes, indicadores_pendientes = _get_pendientes_info(anio, mes_nombre)

    numeradores_guardados:  dict = {}
    denominadores_guardados: dict = {}
    for ind_n in range(1, 7):
        ind_key   = f"IAAS 0{ind_n}"
        d         = leer_indicador_anio(anio, ind_n)
        mes_data  = d.get("MESES", {}).get(mes_nombre.upper(), {})
        if not mes_data:
            continue
        for unidad, vals in mes_data.get("DATOS", {}).items():
            if unidad == "TOTAL_OOAD":
                continue
            numeradores_guardados.setdefault(unidad, {})[ind_key]  = vals.get("NUMERADOR")
            denominadores_guardados.setdefault(unidad, {})[ind_key] = vals.get("DENOMINADOR")

    if not numeradores_guardados and not pendientes:
        return ApiResponse(success=True, message="Sin sesión para este período", data=None)

    return ApiResponse(
        success=True,
        message="Sesión encontrada",
        data={
            "anio":                    anio,
            "mes":                     mes,
            "mes_nombre":              mes_nombre,
            "unidades_pendientes":     pendientes,
            "indicadores_pendientes":  indicadores_pendientes,
            "denominadores_guardados": denominadores_guardados,
            "numeradores_guardados":   numeradores_guardados,
        },
    )


@router.post("/completar-unidad")
async def completar_unidad(
    anio:        str        = Form(...),
    mes:         str        = Form(...),
    unidad:      str        = Form(...),
    indicadores: str        = Form(...),
    denominadores: str      = Form(...),
    password:    str        = Form(...),
    excel_unidad: Optional[UploadFile] = File(None),
    peso_excel_unidad: Optional[int] = Form(None),
    excel_denominador_iaas01: Optional[UploadFile] = File(None),
    peso_excel_denominador_iaas01: Optional[int] = Form(None),
    payload: dict           = Depends(solo_roles("admin", "trabajador_IAAS")),
):
    usuario = payload.get("sub")
    if not verificar_credenciales(usuario, password):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    indicadores_list   = json.loads(indicadores)
    denominadores_dict = json.loads(denominadores)

    excel_bytes = None
    if excel_unidad:
        excel_bytes = await excel_unidad.read()
        if not validarPeso_Archivo(excel_bytes, peso_excel_unidad):
            raise HTTPException(status_code=413, detail="Archivo de la unidad demasiado grande o tamaño inconsistente")

    excel_den01_bytes = None
    if excel_denominador_iaas01:
        excel_den01_bytes = await excel_denominador_iaas01.read()
        if not validarPeso_Archivo(excel_den01_bytes, peso_excel_denominador_iaas01):
            raise HTTPException(status_code=413, detail="Archivo del denominador demasiado grande o tamaño inconsistente")

    try:
        resultado = completar_unidad_tardia(
            anio, mes, unidad,
            indicadores_list,
            denominadores_dict,
            excel_bytes,
            excel_den01_bytes,
        )
    except ValueError as e:
        msg = str(e)
        try:
            detail = json.loads(msg)
        except Exception:
            detail = msg
        raise HTTPException(status_code=400, detail=detail)

    mes_nombre = MESES_NOMBRE.get(mes, mes)
    registrar("SUBIDA_ARCHIVO", usuario=usuario, detalle=f"completar-unidad unidad={unidad} anio={anio} mes={mes}")
    return ApiResponse(
        success=True,
        message=f"Unidad {unidad} actualizada en {mes_nombre} {anio}",
        data=resultado,
    )
