"""
Módulo  : auth.py
Carpeta : shared/
Qué hace: Re-exporta las dependencias de autenticación para uso uniforme en todos los controllers.
Usado en: cualquier controller que requiera autenticación
"""
from auth.services.jwt_utils import verificar_token, solo_admin

__all__ = ["verificar_token", "solo_admin"]
