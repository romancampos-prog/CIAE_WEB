"""
Al moento de que pasan un arhvivo se valida si el tmañoque mando es aceptado
para evitar que la memoria ram se llene en el servido

Tambien trae un runner generico de validaciones de CONTENIDO (no de peso):
cada modulo que recibe archivos subidos (IAAS, Extractor -- FTP no aplica,
a el nadie le sube nada) arma su propia lista de checks especificos (headers
esperados, mes/anio declarado, etc.) y se la pasa a ejecutar_validaciones.
El runner no sabe que esta validando, solo corre la lista y junta los
mensajes de error -- por eso es compartible aunque los checks sean distintos.
"""
from typing import Callable


def ejecutar_validaciones(validadores: list[Callable[[], str | list[str] | None]]) -> list[str]:
    """
    Corre una lista de validaciones y junta los mensajes de error.
    Cada validador es una funcion sin argumentos (ya con sus propios datos
    capturados por closure) que regresa:
      - None                si paso
      - un string            si fallo con un solo mensaje
      - una lista de strings si fallo con varios mensajes (ej. una validacion
        que revisa columna por columna y quiere reportarlas todas de una vez)
    Si un validador ya existente avienta una excepcion en vez de regresar un
    mensaje (ej. _validar_mes_anio_archivo de Extractor), tambien se captura
    -- asi el runner sirve con validadores viejos sin tener que reescribirlos.
    """
    errores: list[str] = []
    for validar in validadores:
        try:
            resultado = validar()
        except Exception as e:
            errores.append(str(e))
            continue
        if not resultado:
            continue
        errores.extend(resultado) if isinstance(resultado, list) else errores.append(resultado)
    return errores


def validar_columnas_esperadas(nombres_reales: list, esperadas: dict[str, str], prefijo: str = "") -> list[str]:
    """
    Compara los encabezados reales del Excel contra {letra: nombre esperado}
    (sin distinguir mayusculas) -- ver shared.extraccion_service.columnas_esperadas.
    """
    from shared.extraccion_service import letra_a_numero

    errores = []
    for letra, esperado in esperadas.items():
        idx = letra_a_numero(letra)
        if idx >= len(nombres_reales):
            errores.append(f"{prefijo}Falta la columna '{letra}' (se esperaba '{esperado}').")
            continue
        real = str(nombres_reales[idx]).strip()
        if real.upper() != esperado.strip().upper():
            errores.append(f"{prefijo}Columna '{letra}': dice '{real}' (se esperaba '{esperado}').")
    return errores


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