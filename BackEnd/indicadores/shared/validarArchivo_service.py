"""
Al moento de que pasan un arhvivo se valida si el tmañoque mando es aceptado
para evitar que la memoria ram se llene en el servido
"""

def validarPeso_Archivo(contenido, pesoArchivo):
    """
    Valida que el archivo no supere el peso máximo permitido.
    Parámetros:
        contenido: bytes reales ya leídos del archivo (len(contenido) = peso real).
        pesoArchivo: el peso que el front dijo que pesaba (archivo.size en JS).
    Retorna:
        True si el archivo es válido, False si supera el peso máximo o si el
        peso real no coincide con lo que el front declaró.
    """
    # primero validar que sea cierto que el archivo pesa lo que dijo el front
    if len(contenido) != pesoArchivo:
        return False

    pesoPermitdo = 10 * 1024 * 1024  # 10 MB en bytes
    if pesoArchivo > pesoPermitdo:
        return False

    return True