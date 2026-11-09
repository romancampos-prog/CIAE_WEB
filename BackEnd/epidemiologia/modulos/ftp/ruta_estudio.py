"""
Donde va el estudio (Excel) de un registro: {año}/{unidad}/{mes}/, con el año y el mes de su fecha
de atencion. Al subirlo se guarda con el nombre con que llego; ruta_de_estudio tambien arma el
nombre {fecha}_{clave}_{NSS} (columnas `nombreEstudio` del mapeo) para reconocer los que alguien
pone a mano en la carpeta con ese nombre.
Usado en: services/ftp/estudios_acciones_Services.py, services/ftp/sincronizar_estudios_Services.py
"""
import re
from datetime import datetime
from pathlib import Path

# Lo que Windows no deja en un nombre de carpeta o archivo
_NO_PERMITIDOS = re.compile(r'[\\/:*?"<>|]+')


def nombre_seguro(texto: str) -> str:
    """El texto sin lo que Windows no deja en un nombre (\\ / : * ? " < > |)."""

    return _NO_PERMITIDOS.sub("-", str(texto)).strip(" .") or "SIN_DATO"


##--------------------------------------

def ruta_de_estudio(fila: dict, columna_fecha: str, columnas_nombre: list[str], ano: int, mes: int) -> Path:
    """
    Ruta relativa (sin extension) del estudio de una fila. Si la fecha no se puede leer se usa el
    mes de la extraccion (ano, mes).
    """

    try:
        fecha = datetime.strptime(fila.get(columna_fecha) or "", "%d/%m/%Y")
    except ValueError:
        fecha = datetime(ano, mes, 1)

    partes = [fecha.strftime("%Y-%m-%d") if c == columna_fecha else nombre_seguro(fila.get(c) or "") for c in columnas_nombre]
    nombre = "_".join(p for p in partes if p) or "SIN_NOMBRE"

    return Path(str(fecha.year)) / nombre_seguro(fila.get("Unidad") or "SIN_UNIDAD") / f"{fecha.month:02d}" / nombre
