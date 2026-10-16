"""
Lo que la pagina de Generar del Extractor necesita de cada indicador: lo comun del mapeo
(indicadores_del_modulo) mas lo propio del Extractor -- de corte o mensual, como agrupa,
de donde sale el denominador y que archivos usa y para que.
Usado en: Controller/extractor_Controller.py
"""
from schemas.model.indicadorGenerar_Model import ArchivoIndicadorExtractor, IndicadorGenerarExtractor
from services.indicadorMapeo_Services import cargar_indicador_extractor, indicadores_del_modulo
from services.extractor.corte_extractor_Services import archivo_denominador_aparte, es_indicador_de_corte, nombre_archivo
from shared.unidades_ftp import NOMBRE_AGRUPACION


def indicadores_para_generar() -> list[IndicadorGenerarExtractor]:
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
        cruce = (numerador.model_extra or {}).get("cruce") or {}
        if cruce.get("activa"):
            archivos.append(ArchivoIndicadorExtractor(
                archivo=nombre_archivo(cruce.get("archivoCruce")),
                requerido=False,
                uso="Cruce para validar la vía 2",
            ))

        lista.append(IndicadorGenerarExtractor(
            **base.model_dump(),
            tipo="corte" if es_indicador_de_corte(base.indicador) else "mensual",
            agrupacion=NOMBRE_AGRUPACION.get(numerador.catalogoUnidades, NOMBRE_AGRUPACION[None]),
            denominador=nombre_archivo(mapeo.reporte.denominador.archivo) if denominador_del_archivo else mapeo.informacion.descDen,
            archivos=archivos,
        ))
    return lista
