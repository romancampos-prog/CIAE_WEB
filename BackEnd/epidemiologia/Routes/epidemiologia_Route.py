from fastapi import APIRouter

from ..Controller import archivos_Controller
from ..Controller import pipeline_Controller
from ..Controller import reportes_Controller
from ..Controller import epiFTP


routesEpidemiologia = APIRouter()

#EndPoints ARCHIVOS (SUBIR LA BASE OPERATIVA Y LA BASE SISCEP)
routesEpidemiologia.include_router(archivos_Controller.archivosApi, prefix="/archivos")

#EndPoints PIPELINE (ESTADO Y EJECUTAR EL PROCESAMIENTO DE DENGUE)
routesEpidemiologia.include_router(pipeline_Controller.pipelineApi, prefix="/pipeline")

#EndPoints REPORTES (RESULTADOS POR SECCION: CANAL, MAPAS, ALERTAS, DUPLICADOS)
routesEpidemiologia.include_router(reportes_Controller.reportesApi, prefix="/reportes")

#EndPoints FTP para uso de epidemeologia
routesEpidemiologia.include_router(epiFTP.ftpApi, prefix="/ftp")


