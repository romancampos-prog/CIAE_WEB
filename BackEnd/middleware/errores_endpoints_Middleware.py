from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging

class ErroresEndpointsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, peticion: Request, siguiente_llamada):
        try:
            #end point funcioannado normal
            respuesta = await siguiente_llamada(peticion)
            return respuesta
        
        except Exception as error:
            logging.error(f"💥 Falló la ruta {peticion.url.path}. El error fue: {error}", exc_info=True)
            return JSONResponse(
                status_code=500,
                content= {
                    "resultado": "error",
                    "mensaje": "Error de Servidor Intentelo mas tarde, si persiste comuniquese al correo que aparece abajo"
                }
            )