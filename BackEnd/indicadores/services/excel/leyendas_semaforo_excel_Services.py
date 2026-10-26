"""
Textos de la leyenda del semaforo (ESPERADO / MEDIO / BAJO) en el Excel estandar y el color de
un mes historico con el semaforo de ESE mes.
Usado en: services/excel/escribir_hoja_indicador_Services.py
"""
import re

from services.compartido.semaforo.color_semaforo_Services import evaluar_color
from services.compartido.semaforo.umbrales_semaforo_Services import numero_de_umbral
from shared.MESES import MESES_ESTANDAR as MESES_LISTA


def _es_descendente(limites: dict) -> bool:
    """
    True si "menor es mejor" para este semaforo (hay que compararlo contra el
    umbral con <=, no >=). Dos formatos posibles:
      - Legado: clave "Alto" presente (ej. IAAS) en vez de "Bajo".
      - Explicito (EH 03, DM 04, etc.): el valor de "Esperado" ya trae el
        operador como texto, ej. "<= 17.38" -- ahi se lee el operador
        directo, sin necesidad de la clave "Alto".
    """

    if "Alto" in limites:
        return True

    esperado = limites.get("Esperado")
    return isinstance(esperado, str) and esperado.strip().startswith(("<=", "<"))


##--------------------------------------

def _texto_medio(v_esp, v_critico, descendente) -> str:
    """
    Texto de la leyenda MEDIO -- vacio si Esperado y el umbral critico son el
    mismo numero (semaforo binario, sin nivel Medio real -- ej. "Medio": null
    en el mapeo, como EH 03/DM 04). Sin esto se imprimia un rango vacio/
    imposible (ej. "MEDIO: > 67.53 y < 67.53") que da a entender que existe
    un nivel Medio aunque nunca se use.
    """
    if v_esp == v_critico:
        return ""
    return f"MEDIO: > {v_esp} y < {v_critico}" if descendente else f"MEDIO: < {v_esp} y > {v_critico}"


##--------------------------------------

def _es_rango_compuesto(texto) -> bool:
    """Umbral de dos lados en el mapeo, ej. ">= 5.0 a <= 8.0" o "<= 3.9 o >= 10.0" (MT 03)."""
    return isinstance(texto, str) and len(re.findall(r"\d+(?:\.\d+)?", texto)) > 1


##--------------------------------------

def leyendas_semaforo(limites: dict) -> tuple[str, str, str]:
    """
    Textos (ESPERADO, MEDIO, BAJO/ALTO) de la leyenda. Con umbrales de un solo
    numero se arman como siempre; si alguno es de dos lados, se escribe el rango
    tal cual viene en el mapeo -- si no, "ESPERADO: >= 5.0" se comia el "<= 8.0".
    """

    clave_critica = "Alto" if "Alto" in limites else "Bajo"

    # Solo Esperado/Bajo deciden: el Medio de casi todos ya es de dos lados ("> 12 a < 16").
    if any(_es_rango_compuesto(limites.get(c)) for c in ("Esperado", clave_critica)):
        legible = lambda c: str(limites.get(c) or "").replace(" a ", " y ").strip()
        medio = legible("Medio")
        return (f"ESPERADO: {legible('Esperado')}", f"MEDIO: {medio}" if medio else "",
                f"{clave_critica.upper()}: {legible(clave_critica)}")

    v_esp       = numero_de_umbral(limites.get("Esperado", 0))
    v_critico   = numero_de_umbral(limites.get(clave_critica, 0))
    descendente = _es_descendente(limites)

    if descendente:
        return f"ESPERADO: <= {v_esp}", _texto_medio(v_esp, v_critico, True), f"{clave_critica.upper()}: >= {v_critico}"

    return f"ESPERADO: >= {v_esp}", _texto_medio(v_esp, v_critico, False), f"BAJO: <= {v_critico}"


##--------------------------------------

def calcular_color(valor, idx_mes, indicadorSemaforo):
    if valor == "" or valor is None:
        return 'Gris'

    try:
        val     = float(valor)
        limites = indicadorSemaforo.get(MESES_LISTA[idx_mes], indicadorSemaforo)
        return evaluar_color(val, limites)
    except Exception:
        return 'Gris'
