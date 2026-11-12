"""
Módulo  : auth_Services.py
Carpeta : auth/services/
Qué hace: Verifica credenciales (usuarios internos y de unidad, ambos en BD_CIAE/USUARIOS) y genera tokens JWT.
Usado en: auth_Controller.py
"""

import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from auth.datos.usuarios_internos_Datos import cargar_usuarios_internos
from auth.datos.usuarios_unidades_Datos import cargar_usuarios_unidades
from configs.settings import SECRET_KEY




def verificar_credenciales(usuario: str , contrasena: str):
    # Los internos van al final: un usuario de unidad nunca pisa a uno de ellos.
    usuarios = {**cargar_usuarios_unidades(), **cargar_usuarios_internos()}

    if usuario not in usuarios:
        return None
    

    datos = usuarios[usuario]
    if not datos.get("hash"):
        return None
    
    
    if bcrypt.checkpw(contrasena.encode("utf-8"), datos["hash"].encode("utf-8")):
        return {"usuario": usuario, "rol": datos["rol"], "unidades": datos.get("unidades")}

    return None




def generar_token(usuario: str, rol: str, unidades: list[str] | None = None) -> str :
    payload = {
        "sub" : usuario,
        "rol" : rol,
        "exp" : datetime.now(timezone.utc) + timedelta(hours=4)
    }

    # Usuario de unidad: los nombres de su unidad viajan en el token y las graficas filtran con ellos.
    if unidades:
        payload["unidades"] = unidades

    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")