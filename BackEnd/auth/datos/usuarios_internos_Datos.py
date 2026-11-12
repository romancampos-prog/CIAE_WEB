"""
Módulo  : usuarios_internos_Datos.py
Carpeta : auth/datos/
Qué hace: Lee los usuarios internos de CIAE de BD_CIAE/USUARIOS/usuarios_internos.json:
          { usuario: {"hash": bcrypt, "rol": uno de auth/services/roles_Services.py} }
Usado en: auth/services/auth_Services.py
"""
import json

from configs.settings import DATA_USUARIOS_INTERNOS


def cargar_usuarios_internos() -> dict:
    """Se lee en cada login (archivo chico): un cambio de contraseña o de rol no pide reiniciar. {} si no existe."""

    if not DATA_USUARIOS_INTERNOS.exists():
        return {}

    return json.loads(DATA_USUARIOS_INTERNOS.read_text(encoding="utf-8"))
