"""
Modulo: Autenticación
Que hace? : Modelos Pydantic para login 
Usado: auth_controller.py

request  = palabra asociada a que es para "enviar"
response = palabra asociada a que es para "recibir"
"""

from pydantic import BaseModel


#clase para los parametros del login
class LoginRequest(BaseModel):
    usuario: str
    contrasena : str

#clase para enviar datos al front
class LoginResponse(BaseModel):
    usuario: str
    token: str