"""
Cambiar el estatus de seguimiento de un registro de Acciones (lo elige quien edita Epidemiología):
se valida contra el catalogo del mapeo y se guarda en BD_CIAE.
Usado en: Controller/epiFTP.py
"""
from fastapi import HTTPException

from compartido.auditoria_Services import registrar
from epidemiologia.datos.ftp.estatus_acciones_Datos import catalogo_estatus, guardar_estatus, leer_estatus


def cambiar_estatus(archivo: str, id_registro: str, estatus: str, usuario: str) -> tuple[str, dict]:
    """
    @param id_registro - el "_id" de la fila (modulos/ftp/id_registro.py)
    @param estatus     - clave del catalogo ("NO_REVISADO", "EN_PROCESO", "CON_ESTUDIO")
    """

    #1- Solo los estatus del catalogo
    claves = [e["clave"] for e in catalogo_estatus()["estatus"]]

    if estatus not in claves:
        raise HTTPException(400, f"Estatus no valido: {estatus}. Opciones: {', '.join(claves)}.")

    #2- Guardar junto con los demas registros de la extraccion
    guardados = leer_estatus(archivo)
    guardados[id_registro] = estatus
    guardar_estatus(archivo, guardados)

    #3- Queda en la bitacora quien lo cambio
    registrar("ESTATUS_ACCION", usuario=usuario, detalle=f"{archivo} registro={id_registro} estatus={estatus}")

    return f"Estatus actualizado: {estatus}.", {"id": id_registro, "estatus": estatus}
