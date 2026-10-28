"""
Validaciones de lo que manda el usuario en una solicitud: archivos subidos (peso y tipo) y la
contraseña para sobrescribir datos. Si algo no cuadra se levanta HTTPException con el codigo
que corresponde. La hoja del Excel subido (que trae las columnas del mapeo) se busca en
datos/excel_subido/lector_excel_Datos.py.
Usado en: services/*, epidemiologia (validar_peso_archivo)
"""
from fastapi import HTTPException

from auth.services.auth_Services import verificar_credenciales

PESO_MAXIMO = 10 * 1024 * 1024  # 10 MB, para que un archivo no llene la RAM del servidor

_EXTENSIONES_EXCEL = (".xlsx", ".xls")


def validar_peso_archivo(contenido: bytes, pesoArchivo: int | None) -> bool:
    """True si el archivo pesa lo que el front declaro (archivo.size en JS) y no pasa del maximo."""
    return len(contenido) == pesoArchivo and pesoArchivo <= PESO_MAXIMO


##--------------------------------------

def validar_archivo_subido(contenido: bytes, peso_declarado: int | None, nombre_archivo: str | None = None, etiqueta: str | None = None) -> None:
    """
    Revisa un archivo subido: que sea Excel (solo si se da nombre_archivo; IAAS manda como
    nombre la unidad, no el del archivo) y que pese lo que el front dijo.
    """

    if nombre_archivo is not None and not nombre_archivo.endswith(_EXTENSIONES_EXCEL):
        raise HTTPException(400, f"{etiqueta}: solo se aceptan archivos Excel (.xlsx, .xls)" if etiqueta
                            else "Solo se aceptan archivos Excel (.xlsx, .xls)")

    if not validar_peso_archivo(contenido, peso_declarado):
        raise HTTPException(413, f"{etiqueta}: archivo demasiado grande o tamaño inconsistente" if etiqueta
                            else "Archivo demasiado grande o tamaño inconsistente")


##--------------------------------------

def exigir_contrasena(usuario: str | None, password: str) -> None:
    """Sobrescribir datos ya guardados (regenerar, completar una unidad) pide otra vez la contraseña del usuario."""
    if not verificar_credenciales(usuario, password):
        raise HTTPException(401, "Contraseña incorrecta")
