"""
Lo que pide la pagina de Generar del Extractor: cada indicador con lo propio del Extractor (de
corte o mensual, como agrupa, de donde sale el denominador y que archivos usa).
Usado en: Controller/extractor_Controller.py
"""
from datos.lectura_mapeo.mapeo_por_modulo_Datos import cargar_indicador_extractor
from schemas.model.pagina_generar_Model import ArchivoIndicadorExtractor, IndicadorGenerarExtractor
from services.extractor.catalogo_extractor_Services import (
    archivo_denominador_aparte, configuracion_cruce, es_indicador_de_corte, nombre_archivo,
)
from services.informacion.lista_indicadores_Services import indicadores_del_modulo
from shared.UNIDADES import NOMBRE_AGRUPACION


def indicadores_para_generar() -> list[IndicadorGenerarExtractor]:
    """Lo comun del mapeo mas lo propio del Extractor: de corte o mensual, como agrupa, de donde sale el denominador y que archivos usa."""
    lista = []

    for base in indicadores_del_modulo("extractor"):
        mapeo = cargar_indicador_extractor(base.indicador)
        numerador = mapeo.reporte.numerador
        denominador_del_archivo = getattr(mapeo.reporte.denominador, "fuente", None) == "extractor"
        archivo_denominador = archivo_denominador_aparte(base.indicador)

        archivos = [ArchivoIndicadorExtractor(
            archivo=nombre_archivo(numerador.archivo),
            requerido=True,
            uso="Numerador y denominador" if denominador_del_archivo and not archivo_denominador else "Numerador",
        )]

        if archivo_denominador:
            archivos.append(ArchivoIndicadorExtractor(archivo=nombre_archivo(archivo_denominador), requerido=True, uso="Denominador"))

        cruce = configuracion_cruce(mapeo)

        if cruce:
            archivos.append(ArchivoIndicadorExtractor(archivo=nombre_archivo(cruce.get("archivoCruce")), requerido=False, uso="Cruce para validar la vía 2"))

        lista.append(IndicadorGenerarExtractor(
            **base.model_dump(),
            tipo="corte" if es_indicador_de_corte(base.indicador) else "mensual",
            agrupacion=NOMBRE_AGRUPACION.get(numerador.catalogoUnidades, NOMBRE_AGRUPACION[None]),
            denominador=nombre_archivo(mapeo.reporte.denominador.archivo) if denominador_del_archivo else mapeo.informacion.descDen,
            archivos=archivos,
        ))

    return lista
