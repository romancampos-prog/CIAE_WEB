"""
Recibe y procesa el Excel de población.
Usado en: ftp/__init__.py (prefix /ftp)
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from auth.services.jwt_utils import solo_roles
from ftp.services.poblacion_service import procesar_archivo_poblacion, obtener_ultimo_archivo_poblacion
from configs.response import ApiResponse

router = APIRouter()


@router.get("/poblacion/archivo-actual")
async def obtener_archivo_poblacion_actual(
    payload: dict = Depends(solo_roles("admin", "trabajador_ftp", "trabajador_IAAS", "visitante"))
):
    return ApiResponse(
        success=True,
        message="Archivo de población actual",
        data={"nombre_sin_ext": obtener_ultimo_archivo_poblacion()},
    )


@router.post("/poblacion/subir")
async def subir_poblacion(
    archivo:  UploadFile = File(...),
    payload:  dict       = Depends(solo_roles("admin", "trabajador_ftp"))
):
    if not archivo.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos Excel (.xlsx, .xls)")

    contenido = await archivo.read()
    resultado = procesar_archivo_poblacion(contenido, archivo.filename)

    if not resultado["ok"]:
        raise HTTPException(status_code=422, detail=resultado["detalle"])

    return ApiResponse(
        success=True,
        message=resultado["detalle"],
        data={
            "nombre":          resultado["nombre"],
            "nombre_sin_ext":  resultado["nombre_sin_ext"],
            "unidades":        resultado["unidades"],
            "no_encontradas":  resultado.get("no_encontradas", []),
            "extras":          resultado.get("extras", []),
            "celdas_vacias":   resultado.get("celdas_vacias", 0),
            "errores_datos":   resultado.get("errores_datos", []),
            "alias_sugeridos": resultado.get("alias_sugeridos", {}),
        }
    )
