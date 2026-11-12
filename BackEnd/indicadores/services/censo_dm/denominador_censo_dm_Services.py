"""
Denominador de los indicadores que salen del Censo de pacientes con DM (fuente "censoDM" en el
mapeo, DM 05): que censo le toca a cada mes y cuantos pacientes tiene cada unidad en los grupos
de edad del mapeo.
Usado en: services/extractor/generar_anualizado_censo_Services.py
"""
from datos.bd_ciae.censo_dm_Datos import leer_censo_dm

MES_QUE_USA_CENSO_DEL_ANIO = "Diciembre"


def anio_del_censo(anio: int, mes_nombre: str) -> int:
    """Regla de la ficha: de enero a noviembre se usa el censo del año anterior; en diciembre, el del año en curso."""
    return anio if mes_nombre == MES_QUE_USA_CENSO_DEL_ANIO else anio - 1


##--------------------------------------

def denominador_de_censo_dm(grupos_edad: list[str], anio_censo: int) -> dict[str, int] | None:
    """{unidad: pacientes de ambos sexos en esos grupos}; None si el censo de ese año no se ha subido."""
    unidades = leer_censo_dm(anio_censo).get("UNIDADES")

    if not unidades:
        return None

    return {
        unidad: sum(por_grupo.get(grupo, 0) for por_grupo in por_sexo.values() for grupo in grupos_edad)
        for unidad, por_sexo in unidades.items()
    }


##--------------------------------------

def texto_censo_usado(anio_censo: int) -> str:
    """Se guarda en el mes (como la poblacion usada) para que el Excel diga con que censo se calculo."""
    return f"Censo DM {anio_censo}"
