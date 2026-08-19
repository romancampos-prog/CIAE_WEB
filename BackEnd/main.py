import mimetypes
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")

import os
import sys
from pathlib import Path

# iass y ftp viven en indicadores/ — se exponen con su nombre original
sys.path.insert(0, str(Path(__file__).parent / "indicadores"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from configs.cors import AMBIENTE, ORIGINS

from auth.controllers.auth_controller import router as auth_router

import iaas as iass_module
import ftp as ftp_module
import epidemiologia as epi_module
from indicadores.Routes import indicadores_Route 

DIST = os.path.join(os.path.dirname(__file__), '..', 'FrontEnd', 'dist')

app = FastAPI(title="CIAE Backend", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http") #middleware para eivtar estas tres cosas  X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Strict-Transport-Security
async def agregar_cabeceras_seguridad(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    if AMBIENTE == "produccion":
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response

#cmabios de delcaraciones de Rutas
app.include_router(indicadores_Route , prefix="/Indicadores")

app.include_router(auth_router, prefix="/auth")
for _router, _prefix in ftp_module.ROUTERS:
    app.include_router(_router, prefix=_prefix)

for _router, _prefix in iass_module.ROUTERS:
    app.include_router(_router, prefix=_prefix)
    
for _router, _prefix in epi_module.ROUTERS:
    app.include_router(_router, prefix=_prefix)

app.mount("/assets", StaticFiles(directory=os.path.join(DIST, "assets")), name="assets")



@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    file_path = os.path.realpath(os.path.join(DIST, full_path))
    dist_real = os.path.realpath(DIST)
    if file_path.startswith(dist_real) and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(DIST, "index.html"))




if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8005,
                ssl_keyfile=os.path.join(os.path.dirname(__file__), '..', 'FrontEnd', 'certs', 'key.pem'),
                ssl_certfile=os.path.join(os.path.dirname(__file__), '..', 'FrontEnd', 'certs', 'cert.pem'))