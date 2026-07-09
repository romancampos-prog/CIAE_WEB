import mimetypes
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")

import os
import sys
from pathlib import Path

# iass y ftp_indicadores viven en indicadores/ — se exponen con su nombre original
sys.path.insert(0, str(Path(__file__).parent / "indicadores"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from configs.cors import ORIGINS, ORIGINS_REGEX

from auth.controllers.auth_controller import router as auth_router

import iass as iass_module
import ftp_indicadores as ftp_module
import epidemiologia as epi_module

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
    file_path = os.path.join(DIST, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(DIST, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8005,
                ssl_keyfile=os.path.join(os.path.dirname(__file__), '..', 'FrontEnd', 'certs', 'key.pem'),
                ssl_certfile=os.path.join(os.path.dirname(__file__), '..', 'FrontEnd', 'certs', 'cert.pem'))