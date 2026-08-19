from fastapi import FastAPI

from ..Controller import ftp_Controller
from ..Controller import iaas_Controller
from ..Controller import informacion_Controller
from ..Controller import reportes_Controller


appIndicadores = FastAPI()

#EndPoints FTP (GENERACION MEDIANTE EXTRACCION DE FTP)
appIndicadores.include_router(ftp_Controller, prefix="/ftp")

#EndPoints IASS (GENERACION DE IAAS)
appIndicadores.include_router(iaas_Controller, prefix="/iaas")

#EndPoints REPORTES (BD_CIAE CONSULTAS DATOS DE LOS INDICADORES)
appIndicadores.include_router(reportes_Controller, prefix="/reportes")

#EndPoints INFORMACION (JSON MAPEOS - INFORMACION DEL INDICADOR)
appIndicadores.include_router(informacion_Controller, prefix="/informacion")