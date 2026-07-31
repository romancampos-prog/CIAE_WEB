"""
Módulo  : auth_controller.py
Carpeta : auth/controllers/
Qué hace: Endpoint POST /auth/login — recibe usuario y contraseña, devuelve token JWT.
Usado en: main.py (registrado con prefix /auth)
"""
from fastapi import APIRouter, HTTPException, Request, status
from auth.models.auth_models import LoginRequest, LoginResponse
from auth.services.auth_service import verificar_credenciales, generar_token
from auth.services.rate_limit_service import revisar_bloqueo, registrar_fallo, registrar_exito
from shared.auditoria_service import registrar
from configs.response import ApiResponse

router = APIRouter()


@router.post("/login", response_model=ApiResponse)
async def login(datos: LoginRequest, request: Request):
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

    return ApiResponse(
        success=True,
        message="Login exitoso",
        data=LoginResponse(usuario=usuario["usuario"], token=token)
    )
