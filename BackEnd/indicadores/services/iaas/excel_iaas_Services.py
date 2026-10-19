"""
Excel de IAAS (exclusivo de IAAS: matriz por mes + mensual acumulado + anual, formato
distinto al de FTP/Extractor -- ver services/excel_dibujante_Services.py). Lee lo guardado en
BD_CIAE, calcula los acumulados (tasa y color con la formula y el semaforo del mapeo) y dibuja.
IAAS 01 lleva 4 columnas por mes (egresos, infecciones, dias, tasa) y un umbral por tipo de
hospital; IAAS 02-06, 3 columnas y un solo umbral.
Usado en: services/excel_Services.py
"""
import io

import xlsxwriter

from services.bd_Ciae_Guardado_Services import leer_historico_indicador
from services.calculo_indicador_Services import CLAVE_TOTAL, calcular_resultado
from services.indicadorMapeo_Services import cargar_indicador_iaas
from shared.MESES import MESES_ESTANDAR
from shared.semaforo_service import color_de_resultado
from shared.UNIDADES import ORDEN_DEMAS_IAAS, alias_hgsz

# Las mismas 11 unidades y orden en los 6 indicadores; el OOAD va en la fila de abajo.
UNIDADES = ORDEN_DEMAS_IAAS
MESES = [mes.upper() for mes in MESES_ESTANDAR]
INDICADORES_IAAS = [f"IAAS 0{n}" for n in range(1, 7)]
NOTA = "NOTA: SOLO SE HACE SUMATORIA DE LAS UNIDADES COMPLETAS"

_COLOR_VERDE  = "#0B5445"
_COLOR_DORADO = "#9A7026"
_COLOR_ROJO   = "#7E0808"


def _dato_unidad(datos: dict, unidad: str) -> dict | None:
    """Los datos de una unidad por su nombre del catalogo o, si no aparece, por su alias HGS(MF)/HGSZ(MF)."""
    valores = datos.get(unidad)
    if isinstance(valores, dict):
        return valores
    alias = alias_hgsz(unidad)
    if alias and isinstance(datos.get(alias), dict):
        return datos[alias]
    return None


##--------------------------------------

def _celdas(indicador: str, unidad: str, numerador, denominador) -> dict:
    """NUM / DEN / tasa y color de una unidad con dato completo (o de la suma del OOAD)."""
    mapeo = cargar_indicador_iaas(indicador)
    tasa = calcular_resultado(numerador, denominador, mapeo.reporte.operacion.resultado) if denominador else 0
    return {"numerador": numerador, "denominador": denominador, "tasa": tasa,
            "color_tasa": color_de_resultado(tasa, mapeo.semaforo, None, unidad)}


##--------------------------------------

def _celdas_gris(numerador, denominador) -> dict:
    """Unidad incompleta: se muestra lo que si exista, sin tasa y fuera del total del OOAD."""
    return {"numerador": numerador if numerador is not None else "", "denominador": denominador if denominador is not None else "",
            "tasa": "", "color_tasa": "Gris"}


##--------------------------------------

def _leer_meses(anio: str, indicador: str) -> dict[int, dict]:
    """{numero de mes: {unidad: {numerador, denominador, tasa, color}}} de lo guardado del año."""
    meses = {}
    for mes_nombre, mes_data in leer_historico_indicador(indicador, anio).get("MESES", {}).items():
        if mes_nombre.upper() not in MESES:
            continue
        datos_mes = {}
        for unidad, guardado in mes_data.get("Reporte", {}).items():
            datos_mes[unidad] = {"numerador": guardado.get("numerador"), "denominador": guardado.get("denominador"),
                                 "tasa": guardado.get("%"), "color": guardado.get("desempeno") or "Bajo"}
        if datos_mes:
            meses[MESES.index(mes_nombre.upper()) + 1] = datos_mes
    return meses


##--------------------------------------

def _fila_mensual(datos: dict, indicador: str) -> dict:
    """
    Bloque MENSUAL de un mes: por unidad lo guardado (Gris si quedo incompleta) y el OOAD
    sumando solo las unidades completas. En IAAS 01 una unidad sin registro ese mes no se
    escribe (None) y el OOAD conserva el color guardado; en 02-06 toda unidad se escribe.
    """
    es_iaas01 = indicador == "IAAS 01"
    resultado = {}
    suma_numerador = suma_denominador = 0
    for unidad in UNIDADES:
        dato = _dato_unidad(datos, unidad)
        if dato is None and es_iaas01:
            resultado[unidad] = None
        elif dato is None:
            resultado[unidad] = _celdas_gris(None, None)
        elif dato["color"] == "Gris":
            resultado[unidad] = _celdas_gris(dato["numerador"], dato["denominador"])
        else:
            resultado[unidad] = {"numerador": dato["numerador"], "denominador": dato["denominador"], "tasa": dato["tasa"], "color_tasa": dato["color"]}
            suma_numerador += dato["numerador"] or 0
            suma_denominador += dato["denominador"] or 0

    resultado[CLAVE_TOTAL] = _celdas(indicador, CLAVE_TOTAL, suma_numerador, suma_denominador)
    if es_iaas01 and isinstance(datos.get(CLAVE_TOTAL), dict):
        resultado[CLAVE_TOTAL]["color_tasa"] = datos[CLAVE_TOTAL].get("color")
    return resultado


##--------------------------------------

def _acumulado(meses: dict[int, dict], indicador: str, hasta_mes: int) -> dict:
    """
    Enero -> hasta_mes por unidad y del OOAD (MENSUAL ACUMULADO y ANUAL). El denominador se
    acumula en todos los meses donde exista; si a la unidad le falta el numerador o el
    denominador en algun mes queda Gris (fuera del OOAD) con lo que si tenga. None si no tiene nada.
    """
    resultado = {}
    suma_numerador = suma_denominador = 0
    for unidad in UNIDADES:
        numerador = denominador = 0
        tiene_numerador = tiene_denominador = False
        completo = True
        for numero_mes in range(1, hasta_mes + 1):
            dato = _dato_unidad(meses.get(numero_mes, {}), unidad)
            if not dato:
                continue
            if dato["numerador"] is not None:
                numerador += dato["numerador"]
                tiene_numerador = True
            if dato["denominador"] is not None:
                denominador += dato["denominador"]
                tiene_denominador = True
            if dato["numerador"] is None or dato["denominador"] is None:
                completo = False

        if not tiene_numerador and not tiene_denominador:
            resultado[unidad] = None
        elif not completo:
            resultado[unidad] = _celdas_gris(numerador if tiene_numerador else None, denominador if tiene_denominador else None)
        else:
            resultado[unidad] = _celdas(indicador, unidad, numerador, denominador)
            suma_numerador += numerador
            suma_denominador += denominador

    resultado[CLAVE_TOTAL] = _celdas(indicador, CLAVE_TOTAL, suma_numerador, suma_denominador)
    return resultado


##--------------------------------------

def _estilos(libro) -> dict:
    _cap = {"font_size": 9, "align": "center", "valign": "vcenter",
            "bold": True, "border": 1, "border_color": "#A6A6A6", "num_format": "0.00"}
    _celda = {"font_size": 9, "border_color": "#A6A6A6", "border": 1, "valign": "vcenter", "align": "center", "text_wrap": True, "bold": True}
    return {
        "titulo_tabla":         libro.add_format({"font_size": 12, "align": "center", "bold": True, "font_color": _COLOR_DORADO}),
        "titulo_indicador":     libro.add_format({"font_size": 16, "align": "center", "bold": True, "font_color": _COLOR_VERDE}),
        "unidades_txt":         libro.add_format({"font_size": 11, "align": "center", "bold": True, "valign": "vcenter",
                                                   "bg_color": "#F2F2F2", "border_color": "#A6A6A6", "border": 1}),
        "lista_unidades_txt":   libro.add_format({"font_size": 9, "bg_color": "#F2F2F2", "border_color": "#A6A6A6",
                                                   "border": 1, "valign": "vcenter", "align": "center", "text_wrap": True}),
        "delegacion_txt":       libro.add_format({**_celda, "bg_color": "#808080", "font_color": "#FFFFFF"}),
        "encabezado_meses":     libro.add_format({"font_size": 11, "bg_color": "#F2F2F2", "border_color": "#A6A6A6",
                                                   "border": 1, "valign": "vcenter", "align": "center", "bold": True,
                                                   "font_color": "#3D3D3D"}),
        "color_celda1":         libro.add_format({**_celda, "bg_color": "#f9f9f9", "font_color": "#000000"}),
        "color_celda2":         libro.add_format({**_celda, "bg_color": "#FFFFFF", "font_color": "#000000"}),
        # Igual que color_celda1/2 pero en gris RGB(49,134,155): un numerador o denominador que
        # si existe en una fila Gris, pero que no se conto en el total OOAD.
        "color_celda1_incompleto": libro.add_format({**_celda, "bg_color": "#f9f9f9", "font_color": "#31869B"}),
        "color_celda2_incompleto": libro.add_format({**_celda, "bg_color": "#FFFFFF", "font_color": "#31869B"}),
        # Solo borde superior: un borde completo dejaba una linea vertical justo en el corte de
        # las dos mitades (Ene-Jun / Jul-Dic), como si fueran dos cajas separadas.
        "titulo_iass06":        libro.add_format({"font_size": 11, "bold": True, "align": "center", "valign": "vcenter",
                                                   "top": 1, "top_color": "#A6A6A6",
                                                   "bg_color": "#F2F2F2", "font_color": "#3D3D3D"}),
        "Esperado": libro.add_format({**_cap, "bg_color": _COLOR_VERDE,  "font_color": "white"}),
        "Medio":    libro.add_format({**_cap, "bg_color": _COLOR_DORADO, "font_color": "white"}),
        "Bajo":     libro.add_format({**_cap, "bg_color": _COLOR_ROJO,   "font_color": "white"}),
        "sin_datos":libro.add_format({**_cap, "bg_color": "#CCCCCC",     "font_color": "black"}),
        # Leyenda del umbral: fondo gris y texto del color (los de fondo solido son para datos).
        "Esperado_Leyenda": libro.add_format({**_cap, "bg_color": "#F2F2F2", "font_color": _COLOR_VERDE}),
        "Medio_Leyenda":    libro.add_format({**_cap, "bg_color": "#F2F2F2", "font_color": _COLOR_DORADO}),
        "Bajo_Leyenda":     libro.add_format({**_cap, "bg_color": "#F2F2F2", "font_color": _COLOR_ROJO}),
    }


##--------------------------------------

def _escribir_valores(hoja, estilos: dict, valores: dict, fila_primera: int, col: int) -> None:
    """NUM / DEN / tasa de cada unidad (desde fila_primera) y del OOAD (la fila de abajo), a partir de la columna col."""
    for i, unidad in enumerate([*UNIDADES, CLAVE_TOTAL]):
        val = valores.get(unidad)
        if val is None:
            continue
        clave_base = "delegacion_txt" if unidad == CLAVE_TOTAL else ("color_celda1" if i % 2 == 0 else "color_celda2")
        for desfase, campo in ((0, "numerador"), (1, "denominador")):
            # Si la fila es Gris pero el valor si existe, va en gris: no se conto en el OOAD.
            gris = val["color_tasa"] == "Gris" and val[campo] not in (None, "")
            hoja.write(fila_primera + i, col + desfase, val[campo], estilos.get(f"{clave_base}_incompleto", estilos[clave_base]) if gris else estilos[clave_base])
        hoja.write(fila_primera + i, col + 2, val["tasa"], estilos.get(val["color_tasa"], estilos["sin_datos"]))


##--------------------------------------

def _barra_seccion(hoja, estilos: dict, fila: int, etiqueta: str, meses: list[str], cols_mes: int) -> None:
    """Barra del titulo del bloque; si cruza Julio se repite en dos mitades para no perderla al hacer scroll."""
    ancho = 1 + len(meses) * cols_mes
    hoja.write(fila, 0, "", estilos["titulo_iass06"])
    if "JULIO" in meses:
        corte = 1 + meses.index("JULIO") * cols_mes
        hoja.merge_range(fila, 1,     fila, corte - 1, etiqueta, estilos["titulo_iass06"])
        hoja.merge_range(fila, corte, fila, ancho - 1, etiqueta, estilos["titulo_iass06"])
    else:
        hoja.merge_range(fila, 1, fila, ancho - 1, etiqueta, estilos["titulo_iass06"])


##--------------------------------------

def _hoja_iaas01(libro, estilos: dict) -> dict[str, int]:
    """Dibuja la hoja de IAAS 01 vacia; regresa la fila de la primera unidad de cada bloque."""
    COLS_MES   = 4
    TOTAL_COLS = 1 + 12 * COLS_MES
    semaforo = cargar_indicador_iaas("IAAS 01").semaforo
    # Una fila de umbral por conjunto de grupos con umbrales identicos (ej. "HGS" y "HGR/HGZ/HGO/HGP/OOAD").
    grupos: dict[tuple, list[str]] = {}
    for nombre, metas in semaforo.items():
        grupos.setdefault((metas.get("Esperado", ""), metas.get("Medio", ""), metas.get("Bajo", "")), []).append(nombre)
    filas_umbral = [("/".join(nombres), *metas) for metas, nombres in grupos.items()]

    hoja = libro.add_worksheet("IAAS 01")
    hoja.hide_gridlines(2)
    hoja.set_column(0, 0, 27)
    hoja.set_default_row(20)
    hoja.freeze_panes(0, 1)
    libro.formats[0].set_font_name("Calibri")

    # Titulo, subtitulo y nota se repiten en dos mitades (Enero-Junio / Julio-Diciembre) para
    # no perderlos de vista al hacer scroll a la segunda mitad del año.
    mitad_cols = 1 + 6 * COLS_MES
    for fila, texto, estilo in (
        (0, "INFORMES DE INFECCIONES NOSOCOMIALES", estilos["titulo_indicador"]),
        (1, "DELEGACIÓN GUANAJUATO",                estilos["titulo_indicador"]),
        (2, "INFORMES DE INFECCIONES NOSOCOMIALES", estilos["titulo_indicador"]),
        (3, NOTA,                                   estilos["titulo_tabla"]),
    ):
        hoja.merge_range(fila, 1,          fila, mitad_cols - 1, texto, estilo)
        hoja.merge_range(fila, mitad_cols, fila, TOTAL_COLS - 1, texto, estilo)

    def bloque(fila_seccion: int, etiqueta: str, meses: list[str], con_fila_mes: bool = True, con_umbral: bool = False) -> int:
        # Sin renglon de mes (ANUAL) el encabezado sube uno; MENSUAL lleva el umbral bajo cada mes.
        fila_encab = fila_seccion + 1 if con_fila_mes else fila_seccion
        fila_sub   = fila_encab + 1 + (len(filas_umbral) if con_umbral else 0)
        _barra_seccion(hoja, estilos, fila_seccion, etiqueta, meses, COLS_MES)
        if con_fila_mes:
            hoja.merge_range(fila_encab, 0, fila_sub, 0, "UNIDADES", estilos["unidades_txt"])
        else:
            hoja.write(fila_sub, 0, "UNIDADES", estilos["unidades_txt"])
        for i, unidad in enumerate([*UNIDADES, "OOAD"]):
            hoja.write(fila_sub + 1 + i, 0, unidad, estilos["delegacion_txt"] if unidad == "OOAD" else estilos["lista_unidades_txt"])

        col = 1
        for mes in meses:
            if con_fila_mes:
                hoja.merge_range(fila_encab, col, fila_encab, col + 3, mes, estilos["encabezado_meses"])
            hoja.set_row(fila_sub, 28)
            for desfase, ancho, texto in ((0, 21, "EGRESOS"), (1, 12, "INFECCIONES"), (2, 11, "DÍAS ESTANCIA"), (3, 11, "TASA POR 1000 DÍAS")):
                hoja.set_column(col + desfase, col + desfase, ancho)
                hoja.write(fila_sub, col + desfase, texto, estilos["lista_unidades_txt"])
            for i in range(len(UNIDADES)):
                for desfase in range(4):
                    hoja.write(fila_sub + 1 + i, col + desfase, "", estilos["color_celda1"] if i % 2 == 0 else estilos["color_celda2"])
            for desfase in range(4):
                hoja.write(fila_sub + 1 + len(UNIDADES), col + desfase, "", estilos["delegacion_txt"])
            if con_umbral:
                for i, (etiqueta_umbral, esperado, medio, bajo) in enumerate(filas_umbral):
                    fila = fila_encab + 1 + i
                    hoja.write(fila, col,     etiqueta_umbral, estilos["lista_unidades_txt"])
                    hoja.write(fila, col + 1, esperado,        estilos["Esperado_Leyenda"])
                    hoja.write(fila, col + 2, medio,           estilos["Medio_Leyenda"])
                    hoja.write(fila, col + 3, bajo,            estilos["Bajo_Leyenda"])
            col += COLS_MES
        return fila_sub + 1

    # MENSUAL (12 meses, con umbral), MENSUAL ACUMULADO (sin enero: arranca en febrero) y
    # ANUAL (sin renglon de mes), cada uno a dos filas del anterior.
    mensual   = bloque(5, "MENSUAL", MESES, con_umbral=True)
    acumulado = bloque(mensual + len(UNIDADES) + 2, "MENSUAL ACUMULADO", MESES[1:])
    anual     = bloque(acumulado + len(UNIDADES) + 2, "ANUAL", [""], con_fila_mes=False)
    return {"mensual": mensual, "acumulado": acumulado, "anual": anual}


##--------------------------------------

def _hoja_iaas_uci(libro, estilos: dict, indicador: str) -> dict[str, int]:
    """Dibuja la hoja de IAAS 02-06 vacia; regresa la fila de la primera unidad de cada bloque."""
    COLS_MES   = 3
    TOTAL_COLS = 1 + 12 * COLS_MES
    mapeo = cargar_indicador_iaas(indicador)
    metas = mapeo.semaforo

    hoja = libro.add_worksheet(indicador)
    hoja.hide_gridlines(2)
    hoja.set_column(0, 0, 32)
    hoja.freeze_panes(0, 1)
    hoja.set_column(1, TOTAL_COLS - 1, 9)
    for m in range(12):
        hoja.set_column(2 + m * COLS_MES, 2 + m * COLS_MES, 14)
    hoja.set_default_row(20)
    libro.formats[0].set_font_name("Calibri")

    # Titulo y nota en dos mitades (Enero-Junio / Julio-Diciembre), igual que IAAS 01.
    mitad_cols = 1 + 6 * COLS_MES
    for fila, texto, estilo in ((0, mapeo.excel.titulo, estilos["titulo_indicador"]), (1, NOTA, estilos["titulo_tabla"])):
        hoja.merge_range(fila, 0,          fila, mitad_cols - 1, texto, estilo)
        hoja.merge_range(fila, mitad_cols, fila, TOTAL_COLS - 1, texto, estilo)

    def bloque(fila_seccion: int, etiqueta: str, meses: list[str], con_fila_mes: bool = True, con_umbral: bool = False) -> int:
        # MENSUAL lleva 3 filas de umbral (Esperado/Medio/Bajo) arriba de los encabezados de cada mes.
        fila_mes = fila_seccion + 1 if con_fila_mes else fila_seccion
        fila_sub = fila_mes + 1 + (3 if con_umbral else 0)
        ancho_bloque = 1 + len(meses) * COLS_MES
        _barra_seccion(hoja, estilos, fila_seccion, etiqueta, meses, COLS_MES)
        if con_fila_mes:
            hoja.merge_range(fila_mes, 0, fila_sub, 0, "UNIDADES", estilos["unidades_txt"])
        else:
            hoja.write(fila_sub, 0, "UNIDADES", estilos["unidades_txt"])
        hoja.set_row(fila_sub, 48 if indicador == "IAAS 04" else 30)

        col = 1
        for mes in meses:
            if con_fila_mes:
                hoja.merge_range(fila_mes, col, fila_mes, col + 2, mes, estilos["encabezado_meses"])
            if con_umbral:
                for i, nivel in enumerate(("Esperado", "Medio", "Bajo")):
                    hoja.merge_range(fila_mes + 1 + i, col, fila_mes + 1 + i, col + 2, f"{nivel.upper()}: {metas.get(nivel, '')}", estilos[f"{nivel}_Leyenda"])
            hoja.write(fila_sub, col,     mapeo.excel.columnaNumerador,   estilos["lista_unidades_txt"])
            hoja.write(fila_sub, col + 1, mapeo.excel.columnaDenominador, estilos["lista_unidades_txt"])
            hoja.write(fila_sub, col + 2, "Tasa",                         estilos["lista_unidades_txt"])
            col += COLS_MES

        for i, unidad in enumerate(UNIDADES):
            estilo = estilos["color_celda1"] if i % 2 == 0 else estilos["color_celda2"]
            hoja.write(fila_sub + 1 + i, 0, unidad, estilos["lista_unidades_txt"])
            for c in range(1, ancho_bloque):
                hoja.write(fila_sub + 1 + i, c, "", estilo)
        fila_ooad = fila_sub + 1 + len(UNIDADES)
        hoja.write(fila_ooad, 0, "OOAD", estilos["delegacion_txt"])
        for c in range(1, ancho_bloque):
            hoja.write(fila_ooad, c, "", estilos["delegacion_txt"])
        return fila_sub + 1

    mensual   = bloque(3, "MENSUAL", MESES, con_umbral=True)
    acumulado = bloque(mensual + len(UNIDADES) + 2, "MENSUAL ACUMULADO", MESES[1:])
    anual     = bloque(acumulado + len(UNIDADES) + 2, "ANUAL", [""], con_fila_mes=False)
    return {"mensual": mensual, "acumulado": acumulado, "anual": anual}


##--------------------------------------

def excel_iaas(anio: str, indicadores: list[str]) -> bytes:
    """Un solo indicador -> su hoja; varios -> el libro completo de los 6."""
    salida = io.BytesIO()
    libro  = xlsxwriter.Workbook(salida)
    libro.set_properties({'author': 'Web CIAE'})
    estilos = _estilos(libro)

    # 1. Dibujar las hojas vacias
    hojas = indicadores if len(indicadores) == 1 else INDICADORES_IAAS
    filas = {ind: _hoja_iaas01(libro, estilos) if ind == "IAAS 01" else _hoja_iaas_uci(libro, estilos, ind) for ind in hojas}

    # 2. Llenar cada hoja con lo guardado: cada mes, su acumulado desde enero y el anual
    for indicador in hojas:
        hoja = libro.get_worksheet_by_name(indicador)
        cols_mes, primera_col = (4, 2) if indicador == "IAAS 01" else (3, 1)   # IAAS 01 deja vacia la columna de egresos
        meses = _leer_meses(anio, indicador)
        for numero_mes, datos in meses.items():
            col = primera_col + (numero_mes - 1) * cols_mes
            _escribir_valores(hoja, estilos, _fila_mensual(datos, indicador), filas[indicador]["mensual"], col)
        for numero_mes in range(2, 13):   # el acumulado empieza en febrero
            if numero_mes in meses:
                col = primera_col + (numero_mes - 2) * cols_mes
                _escribir_valores(hoja, estilos, _acumulado(meses, indicador, numero_mes), filas[indicador]["acumulado"], col)
        if meses:
            _escribir_valores(hoja, estilos, _acumulado(meses, indicador, max(meses)), filas[indicador]["anual"], primera_col)

    libro.close()
    return salida.getvalue()
