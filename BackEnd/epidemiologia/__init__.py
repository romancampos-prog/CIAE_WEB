from .controllers.archivos_controller import router as _r_arch
from .controllers.pipeline_controller import router as _r_pipe
from .controllers.reportes_controller import router as _r_rep

ROUTERS = [
    (_r_arch, "/epidemiologia"),
    (_r_pipe, "/epidemiologia"),
    (_r_rep,  "/epidemiologia"),
]
