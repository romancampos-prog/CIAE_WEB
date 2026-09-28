"""
Excel generico de indicadores: uno o varios, de FTP, IAAS o Extractor, siempre
armado desde lo que ya esta guardado en BD_CIAE.
  1) leer_hoja      -> lee la BD (con la regla de cada modulo) y arma una HojaIndicador
  2) _dibujar_*     -> pinta esa hoja (estandar para FTP/Extractor, IAAS con su formato)
  3) generar_excel  -> orquesta todo y regresa el archivo listo (ExcelGenerado)
Usado en: Controller/excel_Controller.py
"""
import base64
import io
import json

import xlsxwriter

from indicadores.schemas.model.excel_Model import (
    ExcelGenerado, HojaIndicador, MetadataHoja, SolicitudExcel,
)
from indicadores.schemas.model.indicador_Model import ReportePrevio, UnidadDatos
from indicadores.services.bd_Ciae_Guardado_Services import leer_semanal_indicador
from indicadores.services.bd_Ciae_Indicadores_Services import CargarReporteIndicador, _normalizar_semaforo
from indicadores.services.excel_dibujante_Services import escribir_hoja_indicador, obtener_estilos_excel
from indicadores.services.indicadorMapeo_Services import RutaMapeoExiste
from shared.MESES import MESES_ESTANDAR

_MAXIMO_NOMBRES_EN_ARCHIVO = 3


class ErrorHoja(Exception):
    """Un indicador no se pudo leer -- no detiene a los demas de la misma solicitud."""


class ExcelSinDatosError(Exception):
    """Ninguno de los indicadores pedidos tenia datos -- errores: {indicador: motivo}."""
    def __init__(self, errores: dict[str, str]):
        super().__init__("; ".join(errores.values()))
        self.errores = errores


# --------------------------------------------------------------------------- #
# 1) Lectura: BD_CIAE -> HojaIndicador
# --------------------------------------------------------------------------- #

def _cargar_metadata(indicador: str) -> tuple[str, MetadataHoja]:
    ruta = RutaMapeoExiste(indicador)
    if not ruta:
        raise ErrorHoja(f"{indicador} no existe en el mapeo.")
    with open(ruta, "r", encoding="utf-8") as archivo:
        crudo = json.load(archivo).get(indicador)
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


def _cargar_semanal(indicador: str, ano: str) -> ReportePrevio | None:
    crudo = leer_semanal_indicador(indicador, ano)
    if not crudo.get("MES"):
        return None
    crudo["MES"] = _normalizar_semaforo(crudo["MES"])
    return ReportePrevio.model_validate(crudo)


def leer_hoja(indicador: str, solicitud: SolicitudExcel) -> HojaIndicador:
    """
    Reglas por modulo (lo unico que cambia al leer):
      - Extractor: los meses son sus cortes cerrados (CORTES.MESES), no MESES.
      - FTP: si el mes mas reciente solo existe como semanal, se usa ese (y su semana).
      - IAAS: todos los meses guardados, tal cual.
    """
    modulo, metadata = _cargar_metadata(indicador)
    ano = str(solicitud.ano)

    cargado = CargarReporteIndicador(indicador, ano)
    if modulo.lower() == "extractor":
        definitivos = cargado[1] if cargado else {}
    else:
        definitivos = dict(cargado[0].MESES) if cargado else {}

    semanal = _cargar_semanal(indicador, ano) if modulo.lower() == "ftp" else None
    disponibles = set(definitivos) | (set(semanal.MES) if semanal else set())

    if not disponibles:
        detalle = "cortes generados" if modulo.lower() == "extractor" else "datos guardados"
        raise ErrorHoja(f"{indicador} no tiene {detalle} de {ano} todavia.")

    if solicitud.mes:
        if solicitud.mes not in disponibles:
            detalle = "el corte de" if modulo.lower() == "extractor" else "datos de"
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


# --------------------------------------------------------------------------- #
# 2) Dibujo: HojaIndicador -> Excel
# --------------------------------------------------------------------------- #

def _a_formato_excel(unidades: dict[str, UnidadDatos]) -> dict[str, dict]:
    # El escritor (escribir_hoja_indicador) lee "resultado" y "color", no "%" y "desempeno".
    return {
        unidad: {
            "numerador":   datos.numerador,
            "denominador": datos.denominador,
            "resultado":   datos.resultado,
            "color":       datos.desempeno,
        }
        for unidad, datos in unidades.items()
    }


def _dibujar_estandar(libro: xlsxwriter.Workbook, estilos: dict, hoja: HojaIndicador) -> None:
    historicos: dict[str, dict[int, dict]] = {}
    for mes, unidades in hoja.meses.items():
        if mes == hoja.mesActivo:
            continue
        for unidad, valores in _a_formato_excel(unidades).items():
            historicos.setdefault(unidad, {})[MESES_ESTANDAR.index(mes)] = valores

    metadata = hoja.metadata
    escribir_hoja_indicador(
        libro, estilos, hoja.indicador,
        _a_formato_excel(hoja.meses[hoja.mesActivo]),
        {
            "titulo":       metadata.titulo,
            "desNum":       metadata.descripcionNumerador,
            "desDen":       metadata.descripcionDenominador,
            "arch":         metadata.nombreArchivo,
            "semaforo":     metadata.semaforo,
            "periodicidad": metadata.periodicidad,
        },
        str(hoja.ano), str(MESES_ESTANDAR.index(hoja.mesActivo) + 1).zfill(2),
        hoja.semana, hoja.semana is not None,
        historicos,
    )


def _armar_excel_estandar(hojas: list[HojaIndicador]) -> bytes:
    salida = io.BytesIO()
    libro = xlsxwriter.Workbook(salida)
    libro.set_properties({"author": "Web CIAE"})
    estilos = obtener_estilos_excel(libro)
    for hoja in hojas:
        _dibujar_estandar(libro, estilos, hoja)
    libro.close()
    return salida.getvalue()


def _armar_excel_iaas(hojas: list[HojaIndicador], ano: int) -> tuple[bytes, str]:
    # IAAS dibuja su propio libro (matriz por mes + acumulado/anual) y relee la BD
    # por su cuenta; uno solo -> su Excel, varios -> el libro completo de los 6.
    from services.iaas.dibujante_excel_iaas_Services import (
        Excel_IAAS01, Excel_IAAS02, Excel_IAAS03, Excel_IAAS04, Excel_IAAS05, Excel_IAAS06,
        Excel_IAAS_Completo,
    )
    por_indicador = {
        "IAAS 01": Excel_IAAS01, "IAAS 02": Excel_IAAS02, "IAAS 03": Excel_IAAS03,
        "IAAS 04": Excel_IAAS04, "IAAS 05": Excel_IAAS05, "IAAS 06": Excel_IAAS06,
    }
    if len(hojas) == 1 and hojas[0].indicador in por_indicador:
        indicador = hojas[0].indicador
        contenido = por_indicador[indicador](str(ano)).getvalue()
        return contenido, f"IAAS_{indicador.replace('IAAS ', '').zfill(2)}_{ano}.xlsx"
    return Excel_IAAS_Completo(str(ano), "0", {}).getvalue(), f"IAAS_{ano}.xlsx"


def _nombre_archivo(hojas: list[HojaIndicador], ano: int) -> str:
    if len(hojas) <= _MAXIMO_NOMBRES_EN_ARCHIVO:
        base = "_".join(h.metadata.nombreArchivo.replace(" ", "_") for h in hojas)
    else:
        base = "_".join(dict.fromkeys(h.indicador.split()[0] for h in hojas))  # familias: EH_DM
    return f"{base}_{ano}.xlsx"


# --------------------------------------------------------------------------- #
# 3) Punto de entrada
# --------------------------------------------------------------------------- #

def generar_excel(solicitud: SolicitudExcel) -> ExcelGenerado:
    hojas: list[HojaIndicador] = []
    errores: dict[str, str] = {}
    for indicador in solicitud.indicadores:
        try:
            hojas.append(leer_hoja(indicador, solicitud))
        except ErrorHoja as error:
            errores[indicador] = str(error)

    if not hojas:
        raise ExcelSinDatosError(errores)

    modulos = {hoja.modulo for hoja in hojas}
    if "IAAS" in modulos and modulos != {"IAAS"}:
        raise ValueError("IAAS todavia no se puede combinar con FTP o Extractor en un mismo Excel.")

    if modulos == {"IAAS"}:
        contenido, nombre = _armar_excel_iaas(hojas, solicitud.ano)
    else:
        contenido, nombre = _armar_excel_estandar(hojas), _nombre_archivo(hojas, solicitud.ano)

    return ExcelGenerado(
        archivo_b64=base64.b64encode(contenido).decode("utf-8"),
        nombre_archivo=nombre,
        completados=[hoja.indicador for hoja in hojas],
        errores=errores,
    )
