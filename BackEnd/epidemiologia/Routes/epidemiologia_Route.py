from fastapi import APIRouter

from ..controllers import archivos_controller
from ..controllers import pipeline_controller
from ..controllers import reportes_controller


routesEpidemiologia = APIRouter()

#EndPoints ARCHIVOS (SUBIR LA BASE OPERATIVA Y LA BASE SISCEP)
routesEpidemiologia.include_router(archivos_controller.archivosApi, prefix="/archivos")

#EndPoints PIPELINE (ESTADO Y EJECUTAR EL PROCESAMIENTO DE DENGUE)
routesEpidemiologia.include_router(pipeline_controller.pipelineApi, prefix="/pipeline")

#EndPoints REPORTES (RESULTADOS POR SECCION: CANAL, MAPAS, ALERTAS, DUPLICADOS)
routesEpidemiologia.include_router(reportes_controller.reportesApi, prefix="/reportes")
