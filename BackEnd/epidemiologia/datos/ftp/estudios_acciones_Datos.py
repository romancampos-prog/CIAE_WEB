"""
Los estudios (Excel) que el admin sube a los registros de Acciones con estatus "Con estudio".
Se guardan tal cual en BD_CIAE/EPIDEMIOLOGIA/ACCIONES/{extraccion}/ESTUDIOS/{año}/{unidad}/{mes}/
(fuera de FTP/: los mandan los doctores y se suben a mano, no se pueden regenerar) y un
indice ESTUDIOS/estudios.json liga cada registro ({id: {ruta, nombreOriginal, fecha, usuario}}).
Si un registro ya tenia estudio, el anterior se queda en la misma carpeta como respaldo.
Usado en: services/ftp/estudios_acciones_Services.py, services/ftp/sincronizar_estudios_Services.py
"""
import json
from datetime import datetime
from pathlib import Path

from epidemiologia.config import RUTA_CAPTURA_ACCIONES


def _carpeta_estudios(extraccion: str) -> Path:
    return RUTA_CAPTURA_ACCIONES / extraccion / "ESTUDIOS"


##--------------------------------------

def leer_indice_estudios(extraccion: str) -> dict[str, dict]:
    """{id del registro: {ruta (relativa a ESTUDIOS/), nombreOriginal, fecha, usuario}}; {} si no hay."""

    ruta = _carpeta_estudios(extraccion) / "estudios.json"

    if not ruta.exists():
        return {}

    return json.loads(ruta.read_text(encoding="utf-8"))


##--------------------------------------

def guardar_estudio(extraccion: str, id_registro: str, carpeta_relativa: Path, nombre: str, contenido: bytes, datos: dict) -> str:
    """
    Escribe el Excel en ESTUDIOS/{carpeta_relativa}/{nombre} y lo anota en el indice. Si el registro
    ya tenia uno, el anterior se renombra con "_respaldo_{fecha}" (no se borra).
    @returns la ruta relativa a ESTUDIOS/ con que quedo
    """

    base = _carpeta_estudios(extraccion)
    indice = leer_indice_estudios(extraccion)
    anterior = indice.get(id_registro)

    if anterior and (base / anterior["ruta"]).exists():
        viejo = base / anterior["ruta"]
        viejo.rename(viejo.with_name(f"{viejo.stem}_respaldo_{datetime.now():%Y%m%d%H%M%S}{viejo.suffix}"))

    # Dos estudios con el mismo nombre en la misma carpeta (ej. "estudio.xlsx"): el nuevo lleva " (2)", " (3)"...
    destino = base / carpeta_relativa / nombre
    copia = 2
    while destino.exists():
        destino = destino.with_name(f"{Path(nombre).stem} ({copia}){Path(nombre).suffix}")
        copia += 1
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(contenido)

    ruta_relativa = destino.relative_to(base).as_posix()
    indice[id_registro] = {"ruta": ruta_relativa, **datos}
    guardar_indice_estudios(extraccion, indice)

    return ruta_relativa


##--------------------------------------

def guardar_indice_estudios(extraccion: str, indice: dict[str, dict]) -> None:
    """Reescribe ESTUDIOS/estudios.json completo."""

    base = _carpeta_estudios(extraccion)
    base.mkdir(parents=True, exist_ok=True)
    (base / "estudios.json").write_text(json.dumps(indice, ensure_ascii=False, indent=2), encoding="utf-8")


##--------------------------------------

def archivos_de_estudios(extraccion: str) -> dict[str, datetime]:
    """
    Los Excel que hay hoy en ESTUDIOS/ (ruta relativa -> fecha de modificacion), sin los respaldos.
    Es lo que de verdad esta en disco, aunque alguien los haya puesto o quitado a mano.
    """

    base = _carpeta_estudios(extraccion)

    if not base.exists():
        return {}

    return {
        ruta.relative_to(base).as_posix(): datetime.fromtimestamp(ruta.stat().st_mtime)
        for ruta in base.rglob("*")
        if ruta.is_file() and ruta.suffix.lower() in (".xlsx", ".xls") and "_respaldo_" not in ruta.stem
    }


##--------------------------------------

def leer_estudio(extraccion: str, ruta_relativa: str) -> bytes | None:
    """El Excel guardado, o None si ya no esta en disco."""

    ruta = _carpeta_estudios(extraccion) / ruta_relativa
    return ruta.read_bytes() if ruta.exists() else None
