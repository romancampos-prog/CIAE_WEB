"""
Subir el Excel de un mes de un archivo del Extractor (SUI-13, Egresos TOCO, Nacimientos,
Defunciones...): se procesa para los indicadores que el mapeo le asigna a ESE archivo, cada uno
segun su periodicidad:
  - de corte (Semestral Anualizado: EH 03, DM 04) -> generar_corte_Services
  - mensual del mismo archivo (MT 03)             -> generar_mensual_Services
  - mensual con dos archivos o anualizado (Neonatal 06) -> generar_por_partes_Services
  - mensual con desfase (Neonatal 04)             -> generar_con_desfase_Services
  - anualizado con el Censo DM (DM 05)            -> generar_anualizado_censo_Services
El cruce con Egresos lo pide el mapeo (cruce.activa), no la periodicidad.
Usado en: Controller/extractor_Controller.py, services/extractor/completar_cruce_Services.py
"""
from fastapi import HTTPException

from datos.excel_subido.lector_excel_Datos import LectorExcel
from datos.lectura_mapeo.mapeo_por_modulo_Datos import cargar_indicador_extractor
from schemas.model.mapeo_extractor_Model import FuenteExtractor
from services.extractor.catalogo_extractor_Services import (
    ANUALIZADO, archivo_denominador_aparte, archivos_del_indicador, indicadores_extractor, tiene_desfase, usa_censo_dm,
)
from compartido.auditoria_Services import registrar
from compartido.validar_archivo_Services import validar_archivo_subido
from services.extractor.conteo_por_unidad_Services import contar_por_unidad
from services.extractor.generar_anualizado_censo_Services import procesar_anualizado_con_censo
from services.extractor.generar_con_desfase_Services import procesar_con_desfase
from services.extractor.generar_corte_Services import procesar_corte
from services.extractor.generar_mensual_Services import calcular_y_guardar_mes
from services.extractor.generar_por_partes_Services import procesar_mes_por_partes
from shared.MESES import MESES_ESTANDAR
from shared.reglas_periodicidad import clave_periodicidad, es_periodicidad_de_corte

# Lo que el Extractor sabe procesar hoy; otra periodicidad en un indicador
# "Extractor" es un error claro, no un guardado a medias.
PERIODICIDADES_CORTE_SOPORTADAS  = {"semestral anualizado"}   # ventana_corte solo arma Junio/Diciembre

PERIODICIDADES_MENSUAL_SOPORTADAS = {"mensual", "mensual mensual acumulado", "mensual anualizado"}


def _procesar_indicador(indicador: str, anio: int, mes_nombre: str, lector: LectorExcel, lector_cruce: LectorExcel | None,
                        archivo: str) -> dict:
    mapeo = cargar_indicador_extractor(indicador)
    periodicidad = clave_periodicidad(mapeo.periodicidad)

    if es_periodicidad_de_corte(mapeo.periodicidad):
        if periodicidad not in PERIODICIDADES_CORTE_SOPORTADAS:
            raise ValueError(f"{indicador}: la periodicidad '{mapeo.periodicidad}' no está soportada por el Extractor.")
        return procesar_corte(indicador, mapeo, anio, mes_nombre, lector, lector_cruce)

    if periodicidad not in PERIODICIDADES_MENSUAL_SOPORTADAS:
        raise ValueError(f"{indicador}: la periodicidad '{mapeo.periodicidad}' no está soportada por el Extractor.")
    if usa_censo_dm(mapeo):
        return procesar_anualizado_con_censo(indicador, mapeo, anio, mes_nombre, lector)
    if tiene_desfase(mapeo):
        return procesar_con_desfase(indicador, mapeo, anio, mes_nombre, lector, archivo)
    # Anualizado necesita guardar los conteos de cada mes para sumar la ventana, aunque salgan del mismo archivo.
    if archivo_denominador_aparte(indicador) or periodicidad == ANUALIZADO:
        return procesar_mes_por_partes(indicador, mapeo, anio, mes_nombre, lector, archivo)

    if not isinstance(mapeo.reporte.denominador, FuenteExtractor):
        raise ValueError(f"{indicador}: un indicador mensual del Extractor necesita el denominador del mismo archivo (fuente 'extractor').")

    numerador   = contar_por_unidad(lector, mapeo.reporte.numerador.model_dump(), anio, mes_nombre)
    denominador = contar_por_unidad(lector, mapeo.reporte.denominador.model_dump(), anio, mes_nombre)

    return calcular_y_guardar_mes(indicador, mapeo, anio, mes_nombre, numerador, denominador)


##--------------------------------------

def respuesta_de_subida(resultados: dict, mes: str, anio: int, usuario: str | None, detalle_auditoria: str) -> tuple[str, dict]:
    """
    Cada indicador se procesa por separado: si todos fallaron (ej. el archivo es de otro mes)
    es un error de la subida; si solo algunos, los demas ya quedaron guardados.
    """

    fallidos = {ind: r["error"] for ind, r in resultados.items() if "error" in r}
    procesados = [ind for ind in resultados if ind not in fallidos]

    if not procesados:
        raise HTTPException(status_code=422, detail="\n".join(dict.fromkeys(fallidos.values())))

    cortes_recalc = sorted({c for r in resultados.values() for c in r.get("cortes_recalculados", [])})
    registrar(
        "SUBIDA_ARCHIVO",
        usuario=usuario,
        detalle=f"{detalle_auditoria} indicadores={procesados}"
                + (f" fallidos={list(fallidos)}" if fallidos else "")
                + (f" cortes_recalculados={cortes_recalc}" if cortes_recalc else ""),
    )

    mensaje = f"{mes} {anio} procesado para {', '.join(procesados)}"

    if any(r.get("corte_generado") for r in resultados.values()):
        mensaje += " (corte generado)"
    if cortes_recalc:
        mensaje += f" -- se recalculó también el corte de {', '.join(cortes_recalc)}, que ya estaba cerrado"
    if fallidos:
        mensaje += f" -- no se pudo procesar {', '.join(fallidos)}"

    return mensaje, resultados


##--------------------------------------

def validar_mes(mes: str) -> None:
    if mes not in MESES_ESTANDAR:
        raise HTTPException(status_code=400, detail=f"Mes invalido: '{mes}' -- debe ser uno de {MESES_ESTANDAR}")


##--------------------------------------

def generar_archivo_mensual(usuario: str | None, anio: int, mes: str, nombre_archivo: str, contenido: bytes, peso: int,
                            archivo: str, nombre_cruce: str | None, contenido_cruce: bytes | None, peso_cruce: int | None) -> tuple[str, dict]:
    """
    Endpoint de subir el Excel de un mes de un archivo base (+ su cruce): se procesa para los
    indicadores que el mapeo le asigna a ESE archivo, leyendo cada hoja una sola vez. Si uno
    falla, los demas se guardan igual (su resultado trae "error" en vez de los conteos).
    """

    # 1. Validar el mes y los archivos subidos
    validar_mes(mes)
    validar_archivo_subido(contenido, peso, nombre_archivo, archivo)

    if contenido_cruce is not None:
        validar_archivo_subido(contenido_cruce, peso_cruce, nombre_cruce, "Egresos Pacientes")

    # 2. Que indicadores alimenta el archivo (sale del mapeo)
    archivos_base = []
    indicadores = []

    for indicador in indicadores_extractor():
        archivos_del_ind = archivos_del_indicador(indicador)
        archivos_base += [clave for clave in archivos_del_ind if clave not in archivos_base]
        if archivo in archivos_del_ind:
            indicadores.append(indicador)

    if archivo not in archivos_base:
        raise ValueError(f"'{archivo}' no es un archivo del Extractor -- opciones: {archivos_base}")

    # 3. Procesar cada indicador por su cuenta
    lector = LectorExcel(contenido)
    lector_cruce = LectorExcel(contenido_cruce) if contenido_cruce else None
    resultados = {}

    for indicador in indicadores:
        try:
            resultados[indicador] = _procesar_indicador(indicador, anio, mes, lector, lector_cruce, archivo)
        except (FileNotFoundError, KeyError, ValueError) as exc:
            resultados[indicador] = {"indicador": indicador, "anio": anio, "mes": mes, "error": str(exc)}

    # 4. Auditar y armar el mensaje
    return respuesta_de_subida(
        resultados, mes, anio, usuario,
        f"archivo=extractor-{archivo}({mes} {anio}, {nombre_archivo}) bytes={len(contenido)}"
        + (f" egresos={nombre_cruce}" if contenido_cruce is not None else ""),
    )
