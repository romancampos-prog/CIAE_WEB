"""
La meta (Esperado) del semaforo leida para la grafica: su sentido (mas o menos es mejor), su
texto y sus numeros (limite o rango).
Usado en: services/grafica/perfil_indicador_Services.py, services/grafica/estadisticas_grafica_Services.py
"""
from services.compartido.semaforo.umbrales_semaforo_Services import RE_UMBRAL, RE_UMBRAL_COMPUESTO


def meta_esperado(umbrales: dict) -> tuple[str, float] | None:
    """
    ("mas", 70.0) si Esperado es ">= 70" (mas es mejor), ("menos", 1.4) si es "<= 1.4".
    None si el semaforo no permite calcular una brecha (rangos compuestos de IAAS, o vacio).
    Acepta tambien el formato legado ({"Bajo": n, "Esperado": n} / {"Alto": n, "Esperado": n}).
    """

    esperado = umbrales.get("Esperado")

    if esperado is None:
        return None
    if isinstance(esperado, (int, float)):
        return ("menos" if "Alto" in umbrales else "mas", float(esperado))

    coincidencia = RE_UMBRAL.match(str(esperado))

    if not coincidencia:
        return None

    operador, valor = coincidencia.groups()

    return ("mas" if operador in (">=", ">") else "menos", float(valor))


##--------------------------------------

def texto_meta(umbrales: dict) -> str | None:
    esperado = umbrales.get("Esperado")

    if esperado is None:
        return None
    if isinstance(esperado, (int, float)):
        return f"{'<=' if 'Alto' in umbrales else '>='} {esperado}"

    return str(esperado)


##--------------------------------------

def meta_numerica(umbrales: dict) -> dict | None:
    """
    La meta (Esperado) con sus numeros, para dibujarla: {"texto": ">= 1.3", "valor": 1.3} si es
    un limite, {"texto": ">= 4 a <= 7", "minimo": 4, "maximo": 7} si es un rango. None si no hay.
    """

    texto = texto_meta(umbrales)

    if texto is None:
        return None

    limite = meta_esperado(umbrales)

    if limite:
        return {"texto": texto, "valor": limite[1]}

    rango = RE_UMBRAL_COMPUESTO.match(texto)

    if rango and rango.group(3) == "a":
        return {"texto": texto, "minimo": float(rango.group(2)), "maximo": float(rango.group(5))}

    return {"texto": texto}


##--------------------------------------

def tipo_de_meta(umbrales: dict) -> str | None:
    """"mas" / "menos" (que direccion es mejor), "rango" (Esperado entre dos valores) o None."""
    limite = meta_esperado(umbrales)

    if limite:
        return limite[0]

    meta = meta_numerica(umbrales)
    return "rango" if meta and "minimo" in meta else None
