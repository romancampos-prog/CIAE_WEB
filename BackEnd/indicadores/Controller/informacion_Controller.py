"""
/Indicadores/informacion: lo que sale del mapeo (lista de indicadores, ficha y ficha tecnica)
para cualquier usuario con sesion. Responde el dato directo (sin ApiResponse): el front lo usa asi.
"""
from fastapi import APIRouter, Depends, HTTPException, status

from auth.services.jwt_Services import solo_roles
from schemas.model.ficha_indicador_Model import FichaTecnicaCompleta
from services.informacion.ficha_indicador_Services import obtener_ficha_indicador, obtener_ficha_tecnica_completa
from services.informacion.lista_indicadores_Services import todos_los_indicadores

informacionApi = APIRouter()

ROLES_CONSULTA = ("admin", "trabajador_ftp", "trabajador_IAAS", "visitante", "unidad")


#Get Indicadores/informacion/indicadores?campo=mostrarGenerar&modulo=ftp  (familias con sus indicadores)
@informacionApi.get("/indicadores")
def lista_indicadores(campo: str = "mostrarGrafica", modulo: str | None = None, usuario: dict = Depends(solo_roles(*ROLES_CONSULTA))):
    indicadores = todos_los_indicadores(campo, modulo)
    if not indicadores:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se encontraron indicadores")
    return indicadores


##--------------------------------------

#Get Indicadores/informacion/ficha/{indicador}  (titulo, objetivo, semaforo, periodicidad)
@informacionApi.get("/ficha/{indicador}")
def ficha_indicador(indicador: str, usuario: dict = Depends(solo_roles(*ROLES_CONSULTA))):
    return obtener_ficha_indicador(indicador)


##--------------------------------------

#Get Indicadores/informacion/ficha-tecnica/{indicador}  (la ficha mas como se calcula, para FichaTecnicaBoton)
@informacionApi.get("/ficha-tecnica/{indicador}", response_model=FichaTecnicaCompleta)
def ficha_tecnica_indicador(indicador: str, usuario: dict = Depends(solo_roles(*ROLES_CONSULTA))):
    ficha = obtener_ficha_tecnica_completa(indicador)
    if not ficha:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No se encontró el indicador: {indicador}")
    return ficha
