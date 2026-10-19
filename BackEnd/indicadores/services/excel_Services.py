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

import xlsxwriter

from schemas.model.excel_Model import ExcelGenerado, HojaIndicador, MetadataHoja, SolicitudExcel
from schemas.model.indicador_Model import UnidadDatos
from services.bd_Ciae_Indicadores_Services import cargar_reporte_indicador, cargar_semanal
from services.calculo_indicador_Services import acumula_sumando_meses, calcular_mensual_acumulado
from services.excel_dibujante_Services import escribir_hoja_indicador, obtener_estilos_excel
from services.extractor.corte_extractor_Services import es_indicador_de_corte
from services.iaas.excel_iaas_Services import excel_iaas
from services.indicadorMapeo_Services import bloque_mapeo
from shared.MESES import MESES_ESTANDAR

_MAXIMO_NOMBRES_EN_ARCHIVO = 3


class ErrorHoja(Exception):
    """Un indicador no se pudo leer -- no detiene a los demas de la misma solicitud."""


##--------------------------------------

class ExcelSinDatosError(Exception):
    """Ninguno de los indicadores pedidos tenia datos -- errores: {indicador: motivo}."""
    def __init__(self, errores: dict[str, str]):
        super().__init__("; ".join(errores.values()))
        self.errores = errores


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


##--------------------------------------

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


##--------------------------------------

def _dibujar_estandar(libro: xlsxwriter.Workbook, estilos: dict, hoja: HojaIndicador) -> None:
    historicos: dict[str, dict[int, dict]] = {}
    # Poblacion usada en CADA mes que aparece en la hoja (no solo el mes activo) --
    # cada uno pudo haberse calculado con una poblacion distinta (regla de corte
    # hacia adelante), asi que cada columna de mes necesita su propia leyenda.
    poblacion_por_mes: dict[int, str | None] = {}
    for mes, mes_reporte in hoja.meses.items():
        poblacion_por_mes[MESES_ESTANDAR.index(mes)] = mes_reporte.Poblacion
        if mes == hoja.mesActivo:
            continue
        for unidad, valores in _a_formato_excel(mes_reporte.Reporte).items():
            historicos.setdefault(unidad, {})[MESES_ESTANDAR.index(mes)] = valores

    # Mensual + mensual acumulado en el mapeo: bloque acumulado debajo, sumando los
    # meses guardados hasta el mes activo (mismo calculo que la grafica). El semanal no aplica.
    acumulado_por_mes = None
    if hoja.semana is None and acumula_sumando_meses(hoja.indicador):
        hasta = MESES_ESTANDAR.index(hoja.mesActivo)
        acumulado = calcular_mensual_acumulado({m: r for m, r in hoja.meses.items() if MESES_ESTANDAR.index(m) <= hasta}, hoja.indicador) or {}
        acumulado_por_mes = {MESES_ESTANDAR.index(m): _a_formato_excel(r.Reporte) for m, r in acumulado.items()}

    metadata = hoja.metadata
    escribir_hoja_indicador(
        libro, estilos, hoja.indicador,
        _a_formato_excel(hoja.meses[hoja.mesActivo].Reporte),
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
        historicos, poblacion_por_mes,
        acumulado_por_mes,
    )


##--------------------------------------

def _armar_excel_estandar(hojas: list[HojaIndicador]) -> bytes:
    salida = io.BytesIO()
    libro = xlsxwriter.Workbook(salida)
    libro.set_properties({"author": "Web CIAE"})
    estilos = obtener_estilos_excel(libro)
    for hoja in hojas:
        _dibujar_estandar(libro, estilos, hoja)
    libro.close()
    return salida.getvalue()


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
        contenido, nombre = _armar_excel_estandar(hojas), _nombre_archivo(hojas, solicitud.ano)

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
