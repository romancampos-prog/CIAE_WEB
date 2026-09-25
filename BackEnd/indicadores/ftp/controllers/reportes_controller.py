"""
Endpoint de recálculo de población de FTP. La generación de indicadores vive en
Controller/ftp_Controller.py (/Indicadores/ftp/...).
Usado en: ftp/__init__.py (prefix /reportes)
"""
from fastapi import APIRouter, Depends, Request

from configs.response import ApiResponse
from auth.services.jwt_utils import solo_roles
from services.indicadorMapeo_Services import AllIndicadores
from ftp.services.recalcular_poblacion_service import actualizar_historico_con_nueva_poblacion, usa_poblacion

router = APIRouter()

ROLES_FTP_FULL = ("admin", "trabajador_ftp")


# ─── /recalcular-poblacion ────────────────────────────────────────────────────

@router.post("/recalcular-poblacion")
async def recalcular_poblacion(request: Request, payload: dict = Depends(solo_roles(*ROLES_FTP_FULL))):
    body = await request.json()
    ano  = str(body.get("ano", "2026"))

    recalculados = []
    errores      = []

    for categoria in AllIndicadores("mostrarGenerar", "ftp"):
        for indicador in categoria.indicadores:
            try:
                if not usa_poblacion(indicador):
                    continue
                ok, detalle, n_meses = actualizar_historico_con_nueva_poblacion(indicador, ano)
                if ok:
                    recalculados.append({"indicador": indicador, "meses": n_meses, "detalle": detalle})
                else:
                    errores.append(f"{indicador}: {detalle}")
            except Exception as e:
                errores.append(f"{indicador}: {str(e)}")

    return ApiResponse(success=True, message="Recálculo completado", data={
        "total":        sum(r["meses"] for r in recalculados),
        "recalculados": recalculados,
        "errores":      errores,
    })
