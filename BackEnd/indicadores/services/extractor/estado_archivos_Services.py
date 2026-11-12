"""
Por cada archivo que usa el Extractor y cada mes del año, si ya esta subido (para la tabla de
la pagina de Generar del Extractor).
Usado en: Controller/extractor_Controller.py
"""
from datos.bd_ciae.extractor_Datos import leer_partes, leer_reporte_extractor
from datos.lectura_mapeo.mapeo_por_modulo_Datos import cargar_indicador_extractor
from services.extractor.catalogo_extractor_Services import (
    ANUALIZADO, archivo_denominador_aparte, archivos_del_indicador, indicadores_extractor,
    nombre_archivo, nombre_sugerido_archivo, tiene_desfase,
)
from services.extractor.generar_con_desfase_Services import clave_defunciones
from shared.MESES import MESES_ESTANDAR, mes_desplazado
from shared.reglas_periodicidad import clave_periodicidad


def estado_archivos(anio: int) -> dict:
    """
    Por cada archivo que usa el Extractor y cada mes del año, si ya esta subido: "completo" si
    el mes esta en TODOS sus indicadores, "parcial" si falta en alguno, "pendiente" si no esta
    en ninguno ('faltan' dice en cuales falta).
    """

    todos = indicadores_extractor()
    reportes = {ind: leer_reporte_extractor(ind, anio) for ind in todos}
    partes = {
        ind: leer_partes(ind, anio) for ind in todos
        if archivo_denominador_aparte(ind) or clave_periodicidad(cargar_indicador_extractor(ind).periodicidad) == ANUALIZADO
    }

    def subido(ind: str, clave: str, mes: str) -> bool:
        # Con dos archivos o anualizado (Neonatal 06), cada archivo se marca por SU lado, no por
        # el mes generado: un anualizado puede tener el archivo subido y aun no su ventana completa.
        if ind not in partes:
            return mes in reportes[ind].get("MESES", {})

        mapeo = cargar_indicador_extractor(ind)

        if tiene_desfase(mapeo):
            # Con desfase cada archivo guarda su parte en el mes del reporte, no en el suyo.
            if mapeo.reporte.denominador.archivo == clave:
                mes_reporte, anio_reporte = mes_desplazado(mes, anio, mapeo.reporte.denominador.model_extra["mesDelReporte"]["desfaseMeses"])
                return "denominador" in leer_partes(ind, anio_reporte).get(mes_reporte, {})

            return clave_defunciones(anio, mes) in partes[ind].get(mes, {})

        fuentes = mapeo.reporte
        partes_del_mes = partes[ind].get(mes, {})

        if fuentes.numerador.archivo == clave and "numerador" not in partes_del_mes:
            return False

        return not (getattr(fuentes.denominador, "archivo", None) == clave and "denominador" not in partes_del_mes)

    # Un bloque por archivo base, cada uno con los indicadores que el mapeo le asigna
    # (incluido el denominador que venga de otro archivo).
    por_base: dict[str, list[str]] = {}

    for ind in todos:
        for clave in archivos_del_indicador(ind):
            por_base.setdefault(clave, []).append(ind)

    archivos = []

    for clave, inds in por_base.items():
        meses = []

        for mes in MESES_ESTANDAR:
            faltan = [ind for ind in inds if not subido(ind, clave, mes)]
            estado = "pendiente" if len(faltan) == len(inds) else "parcial" if faltan else "completo"
            meses.append({"mes": mes, "estado": estado, "faltan": faltan})

        archivos.append({
            "archivo": nombre_archivo(clave), "prefijoArchivo": clave, "nombreSugerido": nombre_sugerido_archivo(clave),
            "requerido": True,
            "uso": f"Base de {', '.join(inds)}", "indicadores": inds, "meses": meses,
        })

    return {"anio": anio, "archivos": archivos}
