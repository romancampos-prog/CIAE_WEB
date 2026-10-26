"""
Excel generico de indicadores: uno o varios, de FTP, IAAS o Extractor, siempre armado desde lo
que ya esta guardado en BD_CIAE.
  1) leer_hoja (leer_hoja_excel_Services)  -> lee la BD con la regla de cada modulo
  2) armar_excel_estandar / excel_iaas      -> pinta las hojas (estandar para FTP/Extractor, IAAS con su formato)
  3) generar_excel                          -> orquesta todo y regresa el archivo listo (ExcelGenerado)
Usado en: Controller/excel_Controller.py
"""
import base64

from schemas.model.excel_Model import ExcelGenerado, HojaIndicador, SolicitudExcel
from services.excel.excel_iaas_Services import excel_iaas
from services.excel.hoja_estandar_excel_Services import armar_excel_estandar
from services.excel.leer_hoja_excel_Services import ErrorHoja, leer_hoja

_MAXIMO_NOMBRES_EN_ARCHIVO = 3


class ExcelSinDatosError(Exception):
    """Ninguno de los indicadores pedidos tenia datos -- errores: {indicador: motivo}."""
    def __init__(self, errores: dict[str, str]):
        super().__init__("; ".join(errores.values()))
        self.errores = errores


##--------------------------------------

def _armar_excel_iaas(hojas: list[HojaIndicador], ano: int) -> tuple[bytes, str]:
    # IAAS dibuja su propio libro (matriz por mes + acumulado/anual) y relee la BD
    # por su cuenta; uno solo -> su Excel, varios -> el libro completo de los 6.
    # El Excel de IAAS siempre trae el año completo (matriz por mes + acumulado),
    # pero el NOMBRE si puede traer el ultimo mes con datos de cada indicador --
    # mismo criterio que FTP (ver _nombre_archivo): solo se agrega si todas las
    # hojas pedidas comparten el mismo ultimo mes, para no mostrar un mes que no
    # le toca a todos por igual.
    meses_en_hojas = {h.mesActivo for h in hojas}
    sufijo_mes = f"_{meses_en_hojas.pop()}" if len(meses_en_hojas) == 1 else ""

    if len(hojas) == 1:
        indicador = hojas[0].indicador
        return excel_iaas(str(ano), [indicador]), f"IAAS_{indicador.replace('IAAS ', '').zfill(2)}{sufijo_mes}_{ano}.xlsx"

    return excel_iaas(str(ano), []), f"IAAS{sufijo_mes}_{ano}.xlsx"


##--------------------------------------

def _nombre_archivo(hojas: list[HojaIndicador], ano: int) -> str:
    familias = dict.fromkeys(h.indicador.split()[0] for h in hojas)  # ej. {"CAMA": None} o {"EH": None, "DM": None}

    if len(hojas) > 1 and len(familias) == 1:
        # varios indicadores de la MISMA familia (ej. CAMA 01/40-49/50-69) -- basta el
        # nombre de la familia, cada indicador ya se distingue por su propia pestaña adentro.
        base = next(iter(familias))
    elif len(hojas) <= _MAXIMO_NOMBRES_EN_ARCHIVO:
        base = "_".join(h.metadata.nombreArchivo.replace(" ", "_") for h in hojas)
    else:
        base = "_".join(familias)  # varias familias distintas: EH_DM

    # El mes de los datos (no el dia en que se genera) -- si no se incluye, descargar
    # el mismo indicador/familia para dos meses distintos da el MISMO nombre de
    # archivo las dos veces (el navegador termina poniendo "(1)", "(2)"... sin forma
    # de saber cual es cual). Solo se agrega si todas las pestañas son del mismo mes
    # (lo normal cuando se pide un mes especifico); si cada una quedo en un mes
    # distinto (solicitud.mes vacio = "ultimo disponible" por indicador), se omite.
    meses_en_hojas = {h.mesActivo for h in hojas}
    sufijo_mes = f"_{meses_en_hojas.pop()}" if len(meses_en_hojas) == 1 else ""

    # Semana (reporte previo/semanal de FTP) -- mismo criterio que el mes: solo si
    # TODAS las pestañas son de la misma semana. Sin esto, dos descargas semanales
    # de semanas distintas quedarian con el mismo nombre de archivo.
    semanas_en_hojas = {h.semana for h in hojas}
    sufijo_semana = f"_S{semanas_en_hojas.pop()}" if len(semanas_en_hojas) == 1 and None not in semanas_en_hojas else ""

    return f"{base}{sufijo_mes}{sufijo_semana}_{ano}.xlsx"


##--------------------------------------

def generar_excel(indicadores: list[str], ano: int, mes: str | None) -> tuple[str, dict]:
    """Endpoint del Excel: (mensaje, ExcelGenerado). ValueError (400) o ExcelSinDatosError (404) si no se puede."""

    # 1. Leer de la BD cada indicador pedido (los que no tienen datos van a errores)
    solicitud = SolicitudExcel(indicadores=indicadores, ano=ano, mes=mes)
    hojas: list[HojaIndicador] = []
    errores: dict[str, str] = {}

    for indicador in solicitud.indicadores:
        try:
            hojas.append(leer_hoja(indicador, solicitud))
        except ErrorHoja as error:
            errores[indicador] = str(error)

    if not hojas:
        raise ExcelSinDatosError(errores)

    # 2. Dibujar: IAAS con su formato, FTP/Extractor con el estandar
    modulos = {hoja.modulo for hoja in hojas}

    if "IAAS" in modulos and modulos != {"IAAS"}:
        raise ValueError("IAAS todavia no se puede combinar con FTP o Extractor en un mismo Excel.")

    if modulos == {"IAAS"}:
        contenido, nombre = _armar_excel_iaas(hojas, solicitud.ano)
    else:
        contenido, nombre = armar_excel_estandar(hojas), _nombre_archivo(hojas, solicitud.ano)

    # 3. Armar la respuesta
    excel = ExcelGenerado(
        archivo_b64=base64.b64encode(contenido).decode("utf-8"),
        nombre_archivo=nombre,
        completados=[hoja.indicador for hoja in hojas],
        errores=errores,
    )
    mensaje = f"Excel generado: {', '.join(excel.completados)}"

    if excel.errores:
        mensaje += f" -- sin datos: {', '.join(excel.errores)}"

    return mensaje, excel.model_dump()
