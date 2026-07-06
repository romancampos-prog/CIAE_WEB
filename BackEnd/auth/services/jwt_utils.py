"""
Módulo  : jwt_utils.py
Carpeta : auth/services/
Qué hace: Verifica tokens JWT. Se usa como dependencia en endpoints protegidos.
Usado en: cualquier controller que requiera autenticación
"""
import jwt
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from configs.settings import SECRET_KEY
from fastapi import Depends

security = HTTPBearer()


def verificar_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")


def solo_admin(payload: dict = Security(verificar_token)):
    if payload.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso restringido")
    return payload


def solo_roles(*roles):
    """Factory: devuelve una dependencia que exige que el rol esté en la lista."""
    def _dep(payload: dict = Depends(verificar_token)):
        if payload.get("rol") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol '{payload.get('rol')}' sin permiso para esta acción"
            )
        return payload
    return _dep
