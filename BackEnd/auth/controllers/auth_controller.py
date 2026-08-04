"""
Módulo  : auth_controller.py
Carpeta : auth/controllers/
Qué hace: Endpoint POST /auth/login — recibe usuario y contraseña, devuelve token JWT.
Usado en: main.py (registrado con prefix /auth)
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from auth.models.auth_models import LoginRequest, LoginResponse
from auth.services.auth_service import verificar_credenciales, generar_token
from auth.services.rate_limit_service import revisar_bloqueo, registrar_fallo, registrar_exito
from auth.services.jwt_utils import verificar_token
from shared.auditoria_service import registrar
from configs.response import ApiResponse
from configs.cors import AMBIENTE

router = APIRouter()

# la cookie dura lo mismo que el JWT (ver auth_service.generar_token: 4 horas)
DURACION_COOKIE_SEGUNDOS = 4 * 60 * 60


@router.post("/login", response_model=ApiResponse)
async def login(datos: LoginRequest, request: Request, response: Response):
    ip = request.client.host
    revisar_bloqueo(ip)

    usuario = verificar_credenciales(datos.usuario, datos.contrasena)

    if not usuario:
        registrar_fallo(ip)
        registrar("LOGIN_FALLIDO", usuario=datos.usuario, ip=ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales no válidas"
        )

    registrar_exito(ip)
    registrar("LOGIN_EXITOSO", usuario=usuario["usuario"], ip=ip)
    token = generar_token(usuario["usuario"], usuario["rol"])

    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        secure=AMBIENTE == "produccion",  # en desarrollo (http) el navegador no la mandaria si fuera secure=True siempre
        samesite="strict",
        max_age=DURACION_COOKIE_SEGUNDOS,
    )

    return ApiResponse(
        success=True,
        message="Login exitoso",
        data=LoginResponse(usuario=usuario["usuario"], rol=usuario["rol"])
    )


@router.get("/me", response_model=ApiResponse)
async def me(payload: dict = Depends(verificar_token)):
    return ApiResponse(
        success=True,
        message="Sesión activa",
        data=LoginResponse(usuario=payload.get("sub"), rol=payload.get("rol"))
    )


@router.post("/logout", response_model=ApiResponse)
async def logout(response: Response):
    response.delete_cookie(
        key="token",
        httponly=True,
        secure=AMBIENTE == "produccion",
        samesite="strict",
    )
    return ApiResponse(success=True, message="Sesión cerrada", data=None)
