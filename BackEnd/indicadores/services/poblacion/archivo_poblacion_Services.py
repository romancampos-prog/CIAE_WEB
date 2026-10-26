"""
El archivo de poblacion InfoSalud: cual esta cargado y subir uno nuevo.
Usado en: Controller/poblacion_Controller.py
"""
from fastapi import HTTPException

from datos.bd_ciae.poblacion_Datos import leer_poblacion
from datos.excel_subido.excel_poblacion_Datos import procesar_archivo_poblacion
from schemas.model.poblacion_Model import ResultadoCargaPoblacion
from shared.auditoria_service import registrar
from shared.validarArchivo_service import validar_archivo_subido


def archivo_poblacion_actual(anio: str | None) -> dict:
    """Nombre (sin extension) del ultimo Excel de poblacion subido y el mes/año que se detecto de el."""
    datos = leer_poblacion(anio)
    return {
        "nombre_sin_ext": datos.get("ARCHIVO") or None,
        "mes_detectado":  datos.get("MES_DETECTADO"),
        "anio_detectado": datos.get("ANIO_DETECTADO"),
    }


##--------------------------------------

def subir_poblacion(usuario: str | None, nombre_archivo: str, contenido: bytes, peso: int, anio: str | None) -> tuple[str, dict]:
    """Endpoint de subir la poblacion: (mensaje, datos) para la respuesta."""

    # 1. Validar que sea Excel y que pese lo que dijo el front
    validar_archivo_subido(contenido, peso, nombre_archivo)

    # 2. Leer el Excel nacional y guardar lo de Guanajuato
    resultado = procesar_archivo_poblacion(contenido, nombre_archivo, anio)

    if not resultado["ok"]:
        raise HTTPException(status_code=422, detail=resultado["detalle"])

    # 3. Auditar
    registrar("SUBIDA_ARCHIVO", usuario=usuario, detalle=f"archivo=poblacion({nombre_archivo}) bytes={len(contenido)}")
    return resultado["detalle"], ResultadoCargaPoblacion(**resultado).model_dump()
