from fastapi import APIRouter

from ..Controller import ftp_Controller
from ..Controller import iaas_Controller
from ..Controller import informacion_Controller
from ..Controller import reportes_Controller


routesIndicadores = APIRouter()

#EndPoints FTP (GENERACION MEDIANTE EXTRACCION DE FTP)
routesIndicadores.include_router(ftp_Controller.ftpApi, prefix="/ftp")

#EndPoints IASS (GENERACION DE IAAS)
routesIndicadores.include_router(iaas_Controller.iaasApi, prefix="/iaas")

#EndPoints REPORTES (BD_CIAE CONSULTAS DATOS DE LOS INDICADORES)
routesIndicadores.include_router(reportes_Controller.reportesApi, prefix="/reportes")

#EndPoints INFORMACION (JSON MAPEOS - INFORMACION DEL INDICADOR)
routesIndicadores.include_router(informacion_Controller.informacionApi, prefix="/informacion")