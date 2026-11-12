"""
Módulo  : usuarios_unidades_Datos.py
Carpeta : auth/datos/
Qué hace: Lee los usuarios de cada hospital/UMF de BD_CIAE/USUARIOS/usuarios_unidades.json:
          { usuario: {"hash": bcrypt, "rol": "unidad", "unidad": nombre, "unidades": [nombres en BD_CIAE]} }
          "unidades" son todos los nombres con que esa unidad se guarda en los reportes (un mismo
          hospital cambia de nombre entre FTP e IAAS/MT/Neonatal, ej. HGSMF 2 / HGZMF 2 IRAPUATO).
Usado en: auth/services/auth_Services.py
"""
import json

from configs.settings import DATA_USUARIOS_UNIDADES


def cargar_usuarios_unidades() -> dict:
    """Se lee en cada login (archivo chico): un cambio de contraseña no pide reiniciar. {} si no existe."""

    if not DATA_USUARIOS_UNIDADES.exists():
        return {}

    return json.loads(DATA_USUARIOS_UNIDADES.read_text(encoding="utf-8"))
