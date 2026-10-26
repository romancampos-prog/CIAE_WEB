"""
Lo que va en cada pestaña del Excel: la ficha del mapeo y los meses guardados en BD_CIAE, con
la regla de lectura de cada modulo (cortes del Extractor, semanal de FTP).
Usado en: services/excel/generar_excel_Services.py
"""
from datos.lectura_mapeo.mapeo_indicadores_Datos import bloque_mapeo
from schemas.model.excel_Model import HojaIndicador, MetadataHoja, SolicitudExcel
from services.compartido.reporte_guardado_Services import cargar_reporte_indicador, cargar_semanal
from services.extractor.catalogo_extractor_Services import es_indicador_de_corte
from shared.MESES import MESES_ESTANDAR


class ErrorHoja(Exception):
    """Un indicador no se pudo leer -- no detiene a los demas de la misma solicitud."""


##--------------------------------------

def _cargar_metadata(indicador: str) -> tuple[str, MetadataHoja]:
    crudo = bloque_mapeo(indicador)

    if crudo is None:
        raise ErrorHoja(f"{indicador} no existe en el mapeo.")

    informacion = crudo["informacion"]
    metadata = MetadataHoja(
        titulo=informacion["titulo"],
        descripcionNumerador=informacion["descNum"],
        descripcionDenominador=informacion["descDen"],
        nombreArchivo=crudo.get("nombreArchivoFinal") or indicador,
        semaforo=crudo.get("semaforo") or {},
        periodicidad=crudo.get("periodicidad"),
    )
    # Un indicador sin modulo en el mapeo es de FTP (asi lo trataba el flujo anterior).
    return crudo.get("modulo") or "FTP", metadata


##--------------------------------------

def leer_hoja(indicador: str, solicitud: SolicitudExcel) -> HojaIndicador:
    """
    Reglas por modulo (lo unico que cambia al leer):
      - Extractor de corte: los meses son sus cortes cerrados (CORTES.MESES), no MESES.
        Un Extractor mensual (MT 03) se lee como IAAS: sus MESES ya estan calculados.
      - FTP: si el mes mas reciente solo existe como semanal, se usa ese (y su semana).
      - IAAS: todos los meses guardados, tal cual.
    """

    modulo, metadata = _cargar_metadata(indicador)
    ano = str(solicitud.ano)

    por_corte = modulo.lower() == "extractor" and es_indicador_de_corte(indicador)
    cargado = cargar_reporte_indicador(indicador, ano)

    if por_corte:
        definitivos = cargado[1] if cargado else {}
    else:
        definitivos = dict(cargado[0].MESES) if cargado else {}

    semanal = cargar_semanal(indicador, ano) if modulo.lower() == "ftp" else None
    disponibles = set(definitivos) | (set(semanal.MES) if semanal else set())

    if not disponibles:
        detalle = "cortes generados" if por_corte else "datos guardados"
        raise ErrorHoja(f"{indicador} no tiene {detalle} de {ano} todavia.")

    if solicitud.mes:
        if solicitud.mes not in disponibles:
            detalle = "el corte de" if por_corte else "datos de"
            raise ErrorHoja(f"{indicador} no tiene {detalle} {solicitud.mes} {ano} generado todavia.")

        mes_activo = solicitud.mes
    else:
        mes_activo = max(disponibles, key=MESES_ESTANDAR.index)

    meses, semana = definitivos, None

    if mes_activo not in definitivos:  # solo puede ser el mes semanal
        meses = {**definitivos, mes_activo: semanal.MES[mes_activo]}
        semana = semanal.SEMANA

    return HojaIndicador(
        indicador=indicador, modulo=modulo, ano=solicitud.ano,
        metadata=metadata, meses=meses, mesActivo=mes_activo, semana=semana,
    )
