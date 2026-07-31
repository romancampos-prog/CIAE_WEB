"""
Módulo  : rate_limit_service.py
Carpeta : auth/services/
Qué hace: Bloquea temporalmente a una IP después de varios intentos fallidos
          de login, para dificultar ataques de fuerza bruta.
Usado en: auth_controller.py
"""
import time
from fastapi import HTTPException, status

_intentos_fallidos: dict = {}   # { ip: {"cuenta": int, "bloqueado_hasta": float} }

MAX_INTENTOS = 3   # 3 intentos si no bloqueado por 30 min 
BLOQUEO_SEGUNDOS = 30 * 60   # 15 minutos


def revisar_bloqueo(ip: str):
    info = _intentos_fallidos.get(ip)
    if info and info["bloqueado_hasta"] > time.time():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos fallidos. Intenta de nuevo más tarde."
        )


def registrar_fallo(ip: str):
    info = _intentos_fallidos.setdefault(ip, {"cuenta": 0, "bloqueado_hasta": 0})
    info["cuenta"] += 1
    if info["cuenta"] >= MAX_INTENTOS:
        info["bloqueado_hasta"] = time.time() + BLOQUEO_SEGUNDOS
        info["cuenta"] = 0


def registrar_exito(ip: str):
    _intentos_fallidos.pop(ip, None)
