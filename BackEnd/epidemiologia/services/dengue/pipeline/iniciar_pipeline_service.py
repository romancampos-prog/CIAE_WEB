"""
Arrancar el pipeline en segundo plano si se puede (no esta corriendo y estan las dos bases).
Usado en: controllers/pipeline_controller.py
"""
import threading

from fastapi import HTTPException

from epidemiologia.config import RUTA_OPERATIVA, RUTA_SISCEP
from epidemiologia.services.dengue.pipeline.estado_pipeline_service import ESTADO
from epidemiologia.services.dengue.pipeline.pasos_pipeline_service import ejecutar_pasos


def iniciar_pipeline() -> tuple[str, None]:
    """Endpoint de ejecutar: (mensaje, None). 409 si ya corre, 400 si falta una base."""

    # 1. Validar que se pueda correr
    if ESTADO["corriendo"]:
        raise HTTPException(status_code=409, detail="El pipeline ya está en ejecución")
    if not RUTA_OPERATIVA.exists():
        raise HTTPException(status_code=400, detail="Falta la base operativa")
    if not RUTA_SISCEP.exists():
        raise HTTPException(status_code=400, detail="Falta la base SisCep")

    # 2. Marcar que arranca y correrlo en un hilo (tarda varios minutos)
    ESTADO.update({
        "corriendo": True, "completado": False,
        "error": None, "paso": "Iniciando...",
    })
    threading.Thread(target=ejecutar_pasos, daemon=True).start()

    return "Pipeline iniciado", None
