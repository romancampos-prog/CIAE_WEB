"""
Por cada archivo que usa el Extractor y cada mes del año, si ya esta subido (para la tabla de
la pagina de Generar del Extractor).
Usado en: Controller/extractor_Controller.py
"""
from datos.bd_ciae.extractor_partes_Datos import leer_partes
from datos.bd_ciae.extractor_reporte_Datos import leer_reporte_extractor
from datos.lectura_mapeo.mapeo_por_modulo_Datos import cargar_indicador_extractor
from services.extractor.catalogo_extractor_Services import (
    ANUALIZADO, archivo_denominador_aparte, archivos_del_indicador, configuracion_cruce, indicadores_extractor,
    nombre_archivo, nombre_sugerido_archivo, tiene_desfase,
)
from services.extractor.generar_con_desfase_Services import clave_defunciones
from shared.MESES import MESES_ESTANDAR, mes_desplazado
from shared.reglas_periodicidad import clave_periodicidad


def estado_archivos(anio: int) -> dict:
    """
    Por cada archivo que usa el Extractor y cada mes del año, si ya esta subido:
      - archivo base: "completo" si el mes esta en TODOS sus indicadores, "parcial" si falta en
        alguno, "pendiente" si no esta en ninguno ('faltan' dice en cuales falta).
      - archivo de cruce (Egresos): "completo" si ya se cruzo en todos sus indicadores,
        "pendiente" si el SUI-13 esta pero falta el cruce, "sin_principal" si ni el SUI-13 se
        ha subido, "sin_registro" si el mes se subio antes de que existiera la marca CRUCE.
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

        return not (fuentes.denominador.archivo == clave and "denominador" not in partes_del_mes)

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
            "tipo": "principal", "requerido": True,
            "uso": f"Base de {', '.join(inds)}", "indicadores": inds, "meses": meses,
        })

    # Un bloque por archivo de cruce distinto (hoy solo Egresos); sale del mapeo.
    por_archivo: dict[str, list[str]] = {}

    for ind in todos:
        cruce = configuracion_cruce(cargar_indicador_extractor(ind))
        if cruce:
            por_archivo.setdefault(cruce.get("archivoCruce"), []).append(ind)

    for archivo_cruce, inds in por_archivo.items():
        meses = []

        for mes in MESES_ESTANDAR:
            marcas = [reportes[i].get("CRUCE", {}).get(mes) for i in inds]
            con_principal = [mes in reportes[i].get("MESES", {}) for i in inds]

            if not all(con_principal):
                estado = "sin_principal"
            elif all(m is True for m in marcas):
                estado = "completo"
            elif any(m is False for m in marcas):
                estado = "pendiente"
            else:
                estado = "sin_registro"

            meses.append({"mes": mes, "estado": estado})

        archivos.append({
            "archivo": nombre_archivo(archivo_cruce), "prefijoArchivo": archivo_cruce, "nombreSugerido": nombre_sugerido_archivo(archivo_cruce),
            "tipo": "cruce", "requerido": False,
            "uso": "Cruce para validar la vía 2", "indicadores": inds, "meses": meses,
        })

    return {"anio": anio, "archivos": archivos}
