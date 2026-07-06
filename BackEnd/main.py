import mimetypes
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from configs.cors import ORIGINS, ORIGINS_REGEX

from auth.controllers.auth_controller import router as auth_router

from indicadores_FTP.controllers.FTP_controller          import router as ftp_router
from indicadores_FTP.controllers.poblacionFTP            import router as poblacion_router

from indicadores_IN_ASS.controllers.in_ass_controller    import router as in_ass_router

from epidemeologia.controllers.archivos_controller       import router as epi_archivos_router
from epidemeologia.controllers.pipeline_controller       import router as epi_pipeline_router
from epidemeologia.controllers.reportes_controller       import router as epi_reportes_router

from reportes.controllers.edicion_controller             import router as edicion_router
from reportes.controllers.reportes_controller            import router as reportes_router

DIST = os.path.join(os.path.dirname(__file__), '..', 'FrontEnd', 'dist')

app = FastAPI(title="CIAE Backend", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_origin_regex=ORIGINS_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router,          prefix="/auth")
app.include_router(ftp_router,           prefix="/ftp")
app.include_router(poblacion_router,     prefix="/ftp")
app.include_router(in_ass_router,        prefix="/in-ass")
app.include_router(epi_archivos_router,  prefix="/epidemiologia")
app.include_router(epi_pipeline_router,  prefix="/epidemiologia")
app.include_router(epi_reportes_router,  prefix="/epidemiologia")
app.include_router(edicion_router,       prefix="/reportes/editar")
app.include_router(reportes_router,      prefix="/reportes")

app.mount("/assets", StaticFiles(directory=os.path.join(DIST, "assets")), name="assets")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    file_path = os.path.join(DIST, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(DIST, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8005,
                ssl_keyfile=os.path.join(os.path.dirname(__file__), '..', 'FrontEnd', 'certs', 'key.pem'),
                ssl_certfile=os.path.join(os.path.dirname(__file__), '..', 'FrontEnd', 'certs', 'cert.pem'))