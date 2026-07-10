from .controllers.iass_controller     import router as _r_iass
from .controllers.reportes_controller import router as _r_rep

# ROUTERS: lista de (router, prefix) que main.py registra
ROUTERS = [
    (_r_iass, "/iass"),
    (_r_rep,  "/reportes"),
]
