"""
El resumen de cada mes para las tarjetas de arriba de la grafica: el Total OOAD con su numerador
y denominador, la meta y las unidades por semaforo. Se arma igual para el dato del mes y para el
acumulado, asi el resumen sigue al switch "Acumulado" del front.
Usado en: services/grafica/estadisticas_grafica_Services.py
"""
from schemas.model.reporte_guardado_Model import UnidadDatos
from services.calculo.resultado_unidades_Services import CLAVE_TOTAL as TOTAL
from services.grafica.metas_semaforo_Services import meta_esperado, texto_meta
from services.semaforo.umbrales_semaforo_Services import umbrales_para


def resumen_por_mes(fuentes: list[tuple[str, dict[str, UnidadDatos], bool]], semaforo: dict) -> list[dict]:
    """
    @param fuentes  - [(mes, {unidad: UnidadDatos}, parcial)] en orden; parcial = mes del semanal sin cerrar
    @param semaforo - el semaforo del mapeo
    @returns un resumen por mes (ver docstring del modulo)
    """

    resumen = []

    for mes, datos, parcial in fuentes:
        total = datos.get(TOTAL)
        conteo = {"Esperado": 0, "Medio": 0, "Bajo": 0, "Gris": 0}

        for unidad, dato in datos.items():
            if unidad != TOTAL:
                conteo[dato.desempeno] = conteo.get(dato.desempeno, 0) + 1

        umbrales = umbrales_para(semaforo, mes, "OOAD") if semaforo else {}

        resumen.append({
            "mes": mes,
            "parcial": parcial,
            "estatal": total.resultado if total else None,
            "numerador": total.numerador if total else None,
            "denominador": total.denominador if total else None,
            "desempenoEstatal": total.desempeno if total else "Gris",
            "meta": texto_meta(umbrales) if semaforo else None,
            # "mas" / "menos": que direccion del resultado es mejor; None en rangos.
            "mejora": (meta_esperado(umbrales) or (None,))[0] if semaforo else None,
            "unidades": conteo,
            "unidadesConDato": sum(v for k, v in conteo.items() if k != "Gris"),
        })

    return resumen
