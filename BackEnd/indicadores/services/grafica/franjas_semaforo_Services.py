"""
Las franjas del semaforo en numeros, para dibujar la grafica sobre ellas: de donde a donde va
cada nivel (Esperado / Medio / Bajo). Se sacan con el MISMO evaluar_color que pinta los
resultados, asi la franja y el color de la barra nunca se contradicen: los numeros del semaforo
son los cortes y se evalua un punto dentro de cada tramo.
Usado en: services/grafica/perfil_indicador_Services.py
"""
import re

from services.semaforo.color_semaforo_Services import evaluar_color

_NUMERO = re.compile(r'-?\d+(?:\.\d+)?')


def _cortes(umbrales: dict) -> list[float]:
    """Todos los numeros del semaforo, ordenados y sin repetir (">= 4 a <= 7" aporta 4 y 7)."""

    numeros = set()

    for valor in umbrales.values():
        if valor is None:
            continue
        numeros.update(float(n) for n in _NUMERO.findall(str(valor)))

    return sorted(numeros)


##--------------------------------------

def franjas_del_semaforo(umbrales: dict) -> list[dict]:
    """
    @param umbrales - el bloque de metas que aplica ({"Bajo": "<= 15.4", "Medio": ..., "Esperado": ">= 20.3"})
    @returns [{desde, hasta, nivel}] de abajo hacia arriba; desde = None en la primera y hasta = None
             en la ultima (siguen sin limite). Tramos vecinos del mismo nivel se juntan.
    """

    cortes = _cortes(umbrales)

    if not cortes:
        return []

    # Un punto dentro de cada tramo: antes del primer corte, entre cortes y despues del ultimo
    margen = max(1.0, abs(cortes[-1]))
    limites = [None, *cortes, None]
    franjas: list[dict] = []

    for desde, hasta in zip(limites, limites[1:]):
        muestra = (desde + hasta) / 2 if desde is not None and hasta is not None else \
            (hasta - margen if desde is None else desde + margen)
        nivel = evaluar_color(muestra, umbrales)

        if nivel == "Gris":
            continue
        if franjas and franjas[-1]["nivel"] == nivel and franjas[-1]["hasta"] == desde:
            franjas[-1]["hasta"] = hasta
        else:
            franjas.append({"desde": desde, "hasta": hasta, "nivel": nivel})

    return franjas
