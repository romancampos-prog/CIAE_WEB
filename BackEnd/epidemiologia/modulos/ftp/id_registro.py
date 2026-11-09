"""
El id de un registro extraido (una fila del OC30), para guardarle su estatus: sale de sus propios
datos (Unidad + las columnas de `seleccionar`: fecha, NSS, agregado, nombre, clave), asi es el
mismo en el previo y en el definitivo del mes. Dos filas identicas comparten estatus.
Usado en: services/ftp/consulta_extraccion_Services.py
"""
import hashlib


def id_de_registro(fila: dict) -> str:
    """Huella corta de los valores de la fila (en orden de columna, sin los campos internos "_...")."""

    texto = "|".join(f"{columna}={fila[columna]}" for columna in sorted(fila) if not columna.startswith("_"))
    return hashlib.sha1(texto.encode("utf-8")).hexdigest()[:16]
