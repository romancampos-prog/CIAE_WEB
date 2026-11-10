"""
El estudio (Excel) de un registro de Acciones con estatus "Con estudio": el admin lo sube y se
guarda tal cual, con el nombre con que llego, en BD_CIAE, ordenado por año / unidad / mes de la fecha de atencion del registro;
despues se puede volver a bajar desde la tabla.
Usado en: Controller/epiFTP.py
"""
import base64
from datetime import datetime
from pathlib import Path

from fastapi import HTTPException

from compartido.auditoria_Services import registrar
from compartido.validar_archivo_Services import exigir_contrasena, validar_archivo_subido
from epidemiologia.datos.ftp.estatus_acciones_Datos import catalogo_estatus, leer_estatus
from epidemiologia.datos.ftp.estudios_acciones_Datos import guardar_estudio, leer_estudio, leer_indice_estudios
from epidemiologia.datos.ftp.extracciones_ftp_Datos import leer_extraccion
from epidemiologia.modulos.ftp.id_registro import id_de_registro
from epidemiologia.modulos.ftp.ruta_estudio import nombre_seguro, ruta_de_estudio
from ..mapeo.mapeo_Services import ExtraerMapeoFTP

def subir_estudio(archivo: str, ano: int, mes: int, id_registro: str, nombre_archivo: str, contenido: bytes, peso: int, usuario: str, password: str | None = None) -> tuple[str, dict]:
    """
    @param ano, mes     - el mes de la tabla donde esta el registro (para encontrarlo)
    @param id_registro  - el "_id" de la fila (modulos/ftp/id_registro.py)
    @param password     - solo para reemplazar un estudio que ya existe
    """

    #1- Que sea un Excel y pese lo que dijo el front
    validar_archivo_subido(contenido, peso, nombre_archivo, "Estudio")

    #2- El registro, en lo guardado de ese mes
    extraccion = leer_extraccion(archivo, ano, f"{mes:02d}") or {"filas": []}
    fila = next((f for f in extraccion["filas"] if id_de_registro(f) == id_registro), None)

    if fila is None:
        raise HTTPException(404, "No se encontro el registro en ese mes; vuelve a cargar la pagina.")

    #3- Solo con un estatus que permite estudio (en el catalogo: "Con estudio")
    catalogo = catalogo_estatus()
    estatus = leer_estatus(archivo).get(id_registro, catalogo["inicial"])
    permite = {e["clave"] for e in catalogo["estatus"] if e.get("permiteEstudio")}

    if estatus not in permite:
        raise HTTPException(400, "El estudio solo se sube cuando el registro esta en \"Con estudio\".")

    #4- Si ya tiene estudio, reemplazarlo pide otra vez la contraseña
    if leer_indice_estudios(archivo).get(id_registro):
        exigir_contrasena(usuario, password or "")

    #5- Carpeta año / unidad / mes (de la fecha de atencion); el archivo conserva el nombre con que llego
    mapeo = ExtraerMapeoFTP(archivo)
    carpeta = ruta_de_estudio(fila, mapeo.columnaFecha, mapeo.nombreEstudio, ano, mes).parent
    nombre = nombre_seguro(Path(nombre_archivo).name)

    #6- Guardar tal cual (el anterior, si habia, queda de respaldo) y dejarlo en la bitacora
    datos = {"nombreOriginal": nombre_archivo, "fecha": datetime.now().isoformat(timespec="seconds"), "usuario": usuario}
    ruta = guardar_estudio(archivo, id_registro, carpeta, nombre, contenido, datos)
    registrar("ESTUDIO_ACCION", usuario=usuario, detalle=f"{archivo} registro={id_registro} archivo={ruta} bytes={len(contenido)}")

    return f"Estudio guardado en {ruta}.", {"id": id_registro, "ruta": ruta, **datos}


##--------------------------------------

def descargar_estudio(archivo: str, id_registro: str) -> tuple[str, dict]:
    """El estudio de un registro en base64, con el nombre con que se guardo."""

    anotado = leer_indice_estudios(archivo).get(id_registro)
    contenido = leer_estudio(archivo, anotado["ruta"]) if anotado else None

    if contenido is None:
        raise HTTPException(404, "Ese registro no tiene estudio guardado.")

    return "Estudio listo para descargar.", {
        "archivo_b64": base64.b64encode(contenido).decode("ascii"),
        "nombre_archivo": Path(anotado["ruta"]).name,
    }
