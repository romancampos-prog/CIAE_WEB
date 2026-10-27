"""
Subir la base operativa o la de SisCep: validar que sea .xlsx y su peso, guardarla y auditar.
Usado en: controllers/archivos_controller.py
"""
from fastapi import HTTPException

from epidemiologia.config import RUTA_OPERATIVA, RUTA_SISCEP
from epidemiologia.datos.dengue.bases_dengue_datos import guardar_base
from shared.auditoria_service import registrar
from shared.validarArchivo_service import validarPeso_Archivo


def _subir_base(usuario: str | None, nombre_archivo: str, contenido: bytes, peso: int, ruta, nombre_auditoria: str) -> dict:
    # 1. Validar que sea .xlsx y que pese lo que dijo el front
    if not nombre_archivo.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos .xlsx")
    if not validarPeso_Archivo(contenido, peso):
        raise HTTPException(status_code=413, detail="Archivo demasiado grande o tamaño inconsistente")

    # 2. Guardar (reemplaza la anterior)
    guardar_base(ruta, contenido)

    # 3. Auditar
    registrar("SUBIDA_ARCHIVO", usuario=usuario, detalle=f"archivo={nombre_auditoria} bytes={len(contenido)}")
    return {"nombre": nombre_archivo, "bytes": len(contenido)}


##--------------------------------------

def subir_base_operativa(usuario: str | None, nombre_archivo: str, contenido: bytes, peso: int) -> tuple[str, dict]:
    datos = _subir_base(usuario, nombre_archivo, contenido, peso, RUTA_OPERATIVA, "operativa.xlsx")
    return "Base operativa guardada", datos


##--------------------------------------

def subir_base_siscep(usuario: str | None, nombre_archivo: str, contenido: bytes, peso: int) -> tuple[str, dict]:
    datos = _subir_base(usuario, nombre_archivo, contenido, peso, RUTA_SISCEP, "siscep.xlsx")
    return "Base SisCep guardada", datos
