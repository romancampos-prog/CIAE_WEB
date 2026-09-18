"""
Tasa, color y leyendas de IAAS leyendo el mapeo UNIFICADO (indicadores/mapeo/IAAS.json):
la formula sale de reporte.operacion.resultado y los umbrales de "semaforo"
(texto con operadores, evaluado por shared/semaforo_service.evaluar_color).
Sustituye a los umbrales Mayor/Menor y la "Tasa" fija de iaas/mapeo/IAAS.json
que usaban extraccion_service._semaforo_general/_semaforo_IAAS01 y
calculos_iaas._color_tasa_* (se conservan las funciones viejas hasta probar
con datos reales).

Que umbrales aplican (fijo o por tipo de hospital) lo decide
shared.semaforo_service.umbrales_para segun la forma del semaforo -- ya no hay
un caso especial por nombre de indicador.
Usado en: iaas/services/extraccion_service.py, procesar_service.py,
          grafica_service.py, calculos_iaas.py
"""
from iaas.services.extraccion_unificada import cargar_indicador_iaas
from shared.color_service import resolver_color
from shared.semaforo_service import evaluar_color, umbrales_para
from shared.UNIDADES import UNIDAD_TIPO_IAAS01, alias_hgsz

# UNIDAD_TIPO_IAAS01 solo tiene los nombres canonicos (HGS/HGSMF); el dato crudo
# a veces trae el alias HGSZ/HGSZMF.
_ALIAS_TIPO_IAAS01 = {
    alias: tipo for nombre, tipo in UNIDAD_TIPO_IAAS01.items()
    for alias in [alias_hgsz(nombre)] if alias
}

_CONTEXTO_FORMULA = {"round": round, "sum": sum, "abs": abs}


def _grupo_de_unidad(unidad: str | None) -> str:
    return UNIDAD_TIPO_IAAS01.get(unidad) or _ALIAS_TIPO_IAAS01.get(unidad, "OOAD")


def calcular_tasa(indicador: str):
    """Regresa tasa(numerador, denominador) segun reporte.operacion.resultado del mapeo."""
    formula = cargar_indicador_iaas(indicador).reporte.operacion.resultado
    return lambda numerador, denominador: eval(
        formula, {"__builtins__": None}, {**_CONTEXTO_FORMULA, "numerador": numerador, "denominador": denominador},
    )


def color_de_tasa(tasa, indicador: str, unidad: str | None = None) -> str:
    """Color de una tasa ya calculada. Sin tasa -> "Bajo", como siempre lo hizo el Excel de IAAS."""
    if tasa is None:
        return "Bajo"
    semaforo = cargar_indicador_iaas(indicador).semaforo
    return evaluar_color(tasa, umbrales_para(semaforo, None, _grupo_de_unidad(unidad)))


def semaforizar_iaas(datos: dict, indicador: str) -> dict:
    """{unidad: {numerador, denominador}} -> {unidad: {numerador, denominador, tasa, color}}."""
    semaforo = cargar_indicador_iaas(indicador).semaforo
    tasa_de  = calcular_tasa(indicador)

    resultado = {}
    for unidad, dato in datos.items():
        numerador   = dato.get("numerador")
        denominador = dato.get("denominador")
        umbrales    = umbrales_para(semaforo, None, _grupo_de_unidad(unidad))

        tasa, color = resolver_color(numerador, denominador, tasa_de, lambda t, u=umbrales: evaluar_color(t, u))
        resultado[unidad] = {"numerador": numerador, "denominador": denominador, "tasa": tasa, "color": color}
    return resultado


def leyenda_fija(indicador: str) -> dict:
    """Textos de umbral de un indicador con semaforo unico (IAAS 02-06), tal cual vienen en el mapeo."""
    metas = cargar_indicador_iaas(indicador).semaforo
    return {"esperado": metas.get("Esperado", ""), "medio": metas.get("Medio", ""), "bajo": metas.get("Bajo", "")}


def leyenda_agrupada(indicador: str) -> list[dict]:
    """
    Una fila por conjunto de grupos con umbrales identicos (ej. IAAS 01: "HGS" y
    "HGR/HGZ/HGO/HGP/OOAD"). Dinamico: si dos grupos comparten umbrales quedan
    juntos; si el mapeo cambia los de alguno, se separa solo.
    """
    semaforo = cargar_indicador_iaas(indicador).semaforo
    grupos: dict[tuple, list[str]] = {}
    for nombre, metas in semaforo.items():
        grupos.setdefault((metas.get("Esperado", ""), metas.get("Medio", ""), metas.get("Bajo", "")), []).append(nombre)
    return [
        {"etiqueta": "/".join(nombres), "esperado": esperado, "medio": medio, "bajo": bajo}
        for (esperado, medio, bajo), nombres in grupos.items()
    ]
