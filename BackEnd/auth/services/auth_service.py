"""
Módulo  : auth_service.py
Carpeta : auth/services/
Qué hace: Verifica credenciales contra el .env y genera tokens JWT.
Usado en: auth_controller.py
"""

import os
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from configs.settings import SECRET_KEY




def verificar_credenciales(usuario: str , contrasena: str):
    usuarios = { #USURIOS TOMADOS DE .ENV
        os.getenv("USER_DrLeo")   : {"hash": os.getenv("HASH_DrLeo"),   "rol": "admin"},
        os.getenv("USER_DrKarla") : {"hash": os.getenv("HASH_DrKarla"), "rol": "admin"},
        os.getenv("USER_Irivin")  : {"hash": os.getenv("HASH_Irivin"),  "rol": "trabajador_IAAS"},
        os.getenv("USER_FTP")     : {"hash": os.getenv("HASH_FTP"),     "rol": "trabajador_ftp"},
        os.getenv("USER_Visit")   : {"hash": os.getenv("HASH_Visit"),   "rol": "visitante"}
    }

    if usuario not in usuarios:
        return None
    

    datos = usuarios[usuario]
    if not datos ["hash"]:
        return None
    
    
    if bcrypt.checkpw(contrasena.encode("utf-8"), datos["hash"].encode("utf-8")):
        return {"usuario": usuario, "rol": datos["rol"]}
    
    return None




def generar_token(usuario: str, rol: str) -> str :
    payload = {
        "sub" : usuario,
        "rol" : rol,
        "exp" : datetime.now(timezone.utc) + timedelta(hours=1)
    }

    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")