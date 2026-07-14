from .controllers.ftp_controller      import router as _r_ftp
from .controllers.poblacion_controller import router as _r_pob
from .controllers.reportes_controller  import router as _r_rep
from .controllers.edicion_controller   import router as _r_edit

ROUTERS = [
    (_r_ftp,  "/ftp"),
    (_r_pob,  "/ftp"),
    (_r_rep,  "/reportes"),
    (_r_edit, "/reportes/editar"),
]
