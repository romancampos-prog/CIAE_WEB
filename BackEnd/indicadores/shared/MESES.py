"""
Los meses del año y las cuentas de mes que usan todos los modulos.
Usado en: casi todos los servicios y en datos/bd_ciae/
"""

MESES_ESTANDAR = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]


def nombre_del_mes(mes: str) -> str | None:
    """Nombre del mes ("Enero"..) a partir de "01".."12"; None si esta fuera de rango."""
    indice = int(mes) - 1
    return MESES_ESTANDAR[indice] if 0 <= indice < len(MESES_ESTANDAR) else None


##--------------------------------------

def mes_desplazado(mes_nombre: str, anio: int, desplazamiento: int) -> tuple[str, int]:
    """(mes, año) a 'desplazamiento' meses de distancia: (Junio, 2026, -11) -> (Julio, 2025)."""
    i = MESES_ESTANDAR.index(mes_nombre) + desplazamiento
    return MESES_ESTANDAR[i % 12], anio + i // 12
