"""
Genera el Excel completo IAAS (01-06) con históricos, semáforo y acumulados.
Usado en: iass/services/procesar_service.py, iass/controllers/reportes_controller.py
"""
import json
import io
import xlsxwriter
import openpyxl
from iaas.config import MESES, ORDEN_DEMAS_IAAS, UNIDADES_HGS_IAAS01
from iaas.config import RUTA_IAAS_JSON, RUTA_DATA_IAAS

with open(RUTA_IAAS_JSON, encoding="utf-8") as _f:
    _CFG = json.load(_f)

RUTA_BASE_IAAS = RUTA_DATA_IAAS

# Mismo orden y mismas 11 unidades que usan IAAS 02-06 (ORDEN_DEMAS_IAAS) — solo cambia que
# IAAS 01 le agrega el renglón de OOAD al final de su propia lista de unidades.
UNIDADES_IAAS     = ORDEN_DEMAS_IAAS + ["DELEGACION"]
UNIDADES_UCI      = ORDEN_DEMAS_IAAS
_UNIDADES_HGS_SET = set(UNIDADES_HGS_IAAS01)


def _alias_hgsz(nombre):
    """
    En el dato crudo, algunas unidades HGS/HGSMF vienen guardadas como HGSZ/HGSZMF —
    es la misma unidad, solo cambia el prefijo. Devuelve el nombre alterno a probar,
    o None si el nombre no tiene ese prefijo.
    """
    if nombre.startswith("HGSMF "):
        return "HGSZMF " + nombre[len("HGSMF "):]
    if nombre.startswith("HGS "):
        return "HGSZ " + nombre[len("HGS "):]
    return None


def _dato_unidad(datos, unidad):
    """Busca los datos de una unidad por su nombre canónico, y si no aparece,
    prueba con el alias HGS(MF)/HGSZ(MF) antes de darla por sin datos."""
    v = datos.get(unidad)
    if isinstance(v, dict):
        return v
    alias = _alias_hgsz(unidad)
    if alias:
        v = datos.get(alias)
        if isinstance(v, dict):
            return v
    return None


def _color_tasa_01(tasa, unidad):
    sem      = _CFG["IAAS 01"]["Semaforo"]
    umbrales = sem.get("HGS") if unidad in _UNIDADES_HGS_SET else sem.get("HGZ", sem.get("OOAD"))
    if not umbrales or tasa is None:
        return "Rojo"
    esp = umbrales.get("Esperado", {})
    med = umbrales.get("Medio", {})
    if esp.get("Mayor", 0) <= tasa <= esp.get("Menor", 0):
        return "Verde"
    elif med.get("Mayor", 0) <= tasa < med.get("Menor", 0):
        return "Amarillo"
    return "Rojo"


def _filas_umbrales_iaas01():
    """
    Agrupa los tipos de unidad de IAAS 01 (HGS/HGZ/HGR/HGO/HGP/OOAD) por umbral idéntico.
    Dinámico: si dos tipos comparten los mismos valores de Esperado/Medio quedan en una sola
    fila; si algún tipo cambia sus valores en el JSON, se separa solo automáticamente.
    """
    sem    = _CFG["IAAS 01"]["Semaforo"]
    grupos = {}
    for nombre in ("HGS", "HGZ", "HGR", "HGO", "HGP", "OOAD"):
        umbral = sem.get(nombre)
        if not umbral:
            continue
        esp   = umbral.get("Esperado", {})
        med   = umbral.get("Medio", {})
        clave = (esp.get("Mayor"), esp.get("Menor"), med.get("Mayor"), med.get("Menor"))
        grupos.setdefault(clave, []).append(nombre)

    filas = []
    for (esp_mayor, esp_menor, med_mayor, med_menor), nombres in grupos.items():
        filas.append({
            "etiqueta": "/".join(nombres),
            "verde":    f"{esp_mayor} – {esp_menor}",
            "amarillo": f"> {med_mayor} – < {esp_mayor}",
            "rojo":     f"< {med_mayor}  ó  > {esp_menor}",
        })
    return filas


def _layout_iaas01():
    """
    Calcula, en un solo lugar, todas las filas clave de la hoja IAAS 01. Se deriva del número
    real de grupos de umbral (ver _filas_umbrales_iaas01), no de constantes fijas — así que
    _escribir_IAAS01, _escribir_datos_IAAS01 y _escribir_acumulado_IAAS01 siempre coinciden
    sin importar cuántas filas ocupe la tabla de umbrales.
    """
    N              = len(UNIDADES_IAAS)
    n_filas_umbral = len(_filas_umbrales_iaas01())

    fila_nota = 3

    # "MENSUAL" lleva el umbral (una fila por grupo) anclado bajo enero, metido entre el
    # renglón del nombre de mes y el encabezado — por eso +3+n_filas_umbral en vez de +3.
    fila_seccion_mensual = fila_nota + 1
    fila_inicio_mensual  = fila_seccion_mensual + 3 + n_filas_umbral
    fila_fin_mensual     = fila_inicio_mensual - 1 + N

    fila_seccion_acumulado = fila_fin_mensual + 2
    fila_inicio_acumulado  = fila_seccion_acumulado + 3
    fila_fin_acumulado     = fila_inicio_acumulado - 1 + N

    # Anual no tiene renglón de nombre de mes, por eso son 2 filas de encabezado y no 3.
    fila_seccion_anual = fila_fin_acumulado + 2
    fila_inicio_anual  = fila_seccion_anual + 2

    return {
        "fila_seccion_mensual":   fila_seccion_mensual,
        "fila_inicio_mensual":    fila_inicio_mensual,
        "fila_seccion_acumulado": fila_seccion_acumulado,
        "fila_inicio_acumulado":  fila_inicio_acumulado,
        "fila_seccion_anual":     fila_seccion_anual,
        "fila_inicio_anual":      fila_inicio_anual,
    }


def _color_tasa_uci(tasa, indicador):
    sem = _CFG[indicador].get("Semaforo", {})
    if tasa is None:
        return "Rojo"
    esp = sem.get("Esperado", {})
    med = sem.get("Medio", {})
    if tasa > esp.get("Menor", 0):
        return "Rojo"
    elif tasa >= esp.get("Mayor", 0):
        return "Verde"
    elif tasa >= med.get("Mayor", 0):
        return "Amarillo"
    return "Rojo"


_NOMBRE_A_NUM = {
    "ENERO": 1, "FEBRERO": 2, "MARZO": 3, "ABRIL": 4,
    "MAYO": 5, "JUNIO": 6, "JULIO": 7, "AGOSTO": 8,
    "SEPTIEMBRE": 9, "OCTUBRE": 10, "NOVIEMBRE": 11, "DICIEMBRE": 12,
}


def _leer_historicos_IAAS(anio: str, mes_num: int) -> dict:
    ruta_sesion = RUTA_DATA_IAAS / str(anio)
    historicos  = {}

    for ind_n in range(1, 7):
        ind_key   = f"IAAS 0{ind_n}"
        ruta_json = ruta_sesion / f"IAAS_0{ind_n}.json"
        if not ruta_json.exists():
            historicos[ind_key] = {}
            continue

        try:
            with open(ruta_json, encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"[IAAS JSON] Error leyendo {ruta_json}: {e}")
            historicos[ind_key] = {}
            continue

        h_ind = {}
        for mes_nombre, mes_data in data.get("MESES", {}).items():
            m = _NOMBRE_A_NUM.get(mes_nombre.upper())
            if m is None or m == mes_num:
                continue
            datos_mes = {
                unit: {
                    "numerador":   v.get("NUMERADOR"),
                    "denominador": v.get("DENOMINADOR"),
                    "tasa":        v.get("TASA"),
                    "color":       (v.get("COLOR") or "Rojo").capitalize(),
                }
                for unit, v in mes_data.get("DATOS", {}).items()
            }
            if datos_mes:
                h_ind[m] = datos_mes
        historicos[ind_key] = h_ind

    total = sum(len(v) for v in historicos.values())
    print(f"[IAAS JSON] {total} meses de datos cargados")
    return historicos


def _escribir_unidades(hoja, estilos, fila_inicio, columna):
    for unidad in UNIDADES_IAAS:
        es_total = unidad == "DELEGACION"
        texto    = "OOAD" if es_total else unidad
        estilo   = estilos["delegacion_txt"] if es_total else estilos["lista_unidades_txt"]
        hoja.write(fila_inicio, columna, texto, estilo)
        fila_inicio += 1


def _escribir_bloque_mesIAAS_01(hoja, estilos, fila_titulo_mes, fila_subencabezado, col_inicio, cantidad_unidades, nombre_mes, con_fila_mes=True):
    if con_fila_mes:
        hoja.merge_range(fila_titulo_mes, col_inicio, fila_titulo_mes, col_inicio + 3, nombre_mes, estilos["encabezado_meses"])
    hoja.set_row(fila_subencabezado, 28)
    hoja.set_column(col_inicio,     col_inicio,     24)
    hoja.set_column(col_inicio + 1, col_inicio + 1, 12)
    hoja.set_column(col_inicio + 2, col_inicio + 2, 11)
    hoja.set_column(col_inicio + 3, col_inicio + 3, 11)
    hoja.write(fila_subencabezado, col_inicio,     "EGRESOS",            estilos["lista_unidades_txt"])
    hoja.write(fila_subencabezado, col_inicio + 1, "INFECCIONES",        estilos["lista_unidades_txt"])
    hoja.write(fila_subencabezado, col_inicio + 2, "DÍAS ESTANCIA",      estilos["lista_unidades_txt"])
    hoja.write(fila_subencabezado, col_inicio + 3, "TASA POR 1000 DÍAS", estilos["lista_unidades_txt"])

    for i in range(cantidad_unidades):
        estilo = estilos["color_celda1"] if i % 2 == 0 else estilos["color_celda2"]
        for offset in range(4):
            hoja.write(fila_subencabezado + 1 + i, col_inicio + offset, "", estilo)

    fila_delegacion = fila_subencabezado + cantidad_unidades
    for offset in range(4):
        hoja.write(fila_delegacion, col_inicio + offset, "", estilos["delegacion_txt"])


def _escribir_IAAS01(libro, estilos):
    COLS_MES           = 4
    TOTAL_COLS         = 1 + 12 * COLS_MES
    cantidad_unidades  = len(UNIDADES_IAAS)
    layout             = _layout_iaas01()

    fila_titulo1 = 0
    fila_titulo2 = 1
    fila_titulo3 = 2
    fila_nota    = 3

    hoja = libro.add_worksheet("IAAS 01")
    hoja.set_column(0, 0, 27)
    hoja.set_default_row(20)
    hoja.freeze_panes(0, 1)
    libro.formats[0].set_font_name("Calibri")

    hoja.merge_range(fila_titulo1, 1, fila_titulo1, TOTAL_COLS - 1, "INFORMES DE INFECCIONES NOSOCOMIALES", estilos["titulo"])
    hoja.merge_range(fila_titulo2, 1, fila_titulo2, TOTAL_COLS - 1, "DELEGACIÓN GUANAJUATO",                estilos["titulo"])
    hoja.merge_range(fila_titulo3, 1, fila_titulo3, TOTAL_COLS - 1, "INFORMES DE INFECCIONES NOSOCOMIALES", estilos["titulo"])
    hoja.merge_range(fila_nota,    1, fila_nota,    TOTAL_COLS - 1,
        "NOTA:LA SUMATORIA INCLUYE UNICAMENTE LAS 8 UNIDADES QUE ENTRAN A EVALUACIÓN QUE SON LA 2, 3, 4, 10, 13, 21, 54, 58",
        estilos["titulo_tabla"])

    def _bloque(fila_seccion, etiqueta, meses, con_fila_mes=True, filas_umbral=None):
        """Escribe la etiqueta de sección (igual que IAAS 02-06) + UNIDADES + los meses dados.
        El ancho del bloque se ajusta a cuántos meses traiga — así "MENSUAL ACUMULADO" con
        11 meses (sin enero) no deja una columna de más ni una vacía. con_fila_mes=False quita
        el renglón del nombre de mes (bloque ANUAL, que no tiene mes que mostrar).
        filas_umbral (solo "MENSUAL"): inserta una fila por grupo de umbral (ver
        _filas_umbrales_iaas01) entre el nombre de mes y el encabezado, repetida debajo de
        cada mes del bloque."""
        if con_fila_mes:
            fila_encab = fila_seccion + 1
            siguiente  = fila_encab + 1
        else:
            fila_encab = fila_seccion
            siguiente  = fila_seccion + 1

        if filas_umbral:
            fila_umbral_inicio = siguiente
            fila_sub = fila_umbral_inicio + len(filas_umbral)
        else:
            fila_sub = siguiente

        ancho_bloque = 1 + len(meses) * COLS_MES
        hoja.write(fila_seccion, 0, "", estilos["titulo_iass06"])
        hoja.merge_range(fila_seccion, 1, fila_seccion, ancho_bloque - 1, etiqueta, estilos["titulo_iass06"])
        if con_fila_mes:
            hoja.merge_range(fila_encab, 0, fila_sub, 0, "UNIDADES", estilos["unidades_txt"])
        else:
            hoja.write(fila_sub, 0, "UNIDADES", estilos["unidades_txt"])

        _escribir_unidades(hoja, estilos, fila_sub + 1, 0)
        col = 1
        for mes in meses:
            _escribir_bloque_mesIAAS_01(hoja, estilos, fila_encab, fila_sub, col, cantidad_unidades, mes, con_fila_mes=con_fila_mes)
            if filas_umbral:
                for i, f in enumerate(filas_umbral):
                    fila = fila_umbral_inicio + i
                    hoja.write(fila, col,     f["etiqueta"], estilos["lista_unidades_txt"])
                    hoja.write(fila, col + 1, f["verde"],    estilos["Verde_Leyenda"])
                    hoja.write(fila, col + 2, f["amarillo"], estilos["Amarillo_Leyenda"])
                    hoja.write(fila, col + 3, f["rojo"],     estilos["Rojo_Leyenda"])
            col += COLS_MES

    # Bloque "MENSUAL": los 12 meses normales, uno arriba del otro con el resto de indicadores.
    # Lleva el umbral (una fila por grupo, ver _filas_umbrales_iaas01) repetido bajo cada mes.
    _bloque(layout["fila_seccion_mensual"], "MENSUAL", MESES, filas_umbral=_filas_umbrales_iaas01())

    # Bloque "MENSUAL ACUMULADO": debajo del mensual, sin enero — arranca directo en febrero,
    # no queda como una columna vacía al inicio.
    _bloque(layout["fila_seccion_acumulado"], "MENSUAL ACUMULADO", MESES[1:])

    # Bloque "ANUAL": al final, sin renglón de mes — directo del título a los datos.
    _bloque(layout["fila_seccion_anual"], "ANUAL", [""], con_fila_mes=False)


def Excel_IAAS01(anio: str = None):
    salida  = io.BytesIO()
    libro   = xlsxwriter.Workbook(salida)
    libro.set_properties({'author': 'Web CIAE'})
    estilos = Estilos_IAAS01(libro)
    _escribir_IAAS01(libro, estilos)

    if anio:
        hoja = libro.get_worksheet_by_name("IAAS 01")
        all_months = dict(_leer_historicos_IAAS(anio, 0).get("IAAS 01", {}))
        for m, mes_datos in all_months.items():
            _escribir_datos_IAAS01(hoja, estilos, m, mes_datos)
        _escribir_acumulado_IAAS01(hoja, estilos, all_months)
        _escribir_anual_IAAS01(hoja, estilos, all_months)

    libro.close()
    salida.seek(0)
    return salida


_COLOR_VERDE  = "#0B5445"
_COLOR_DORADO = "#9A7026"
_COLOR_ROJO   = "#7E0808"


def Estilos_IAAS01(libro):
    _cap = {"font_size": 9, "align": "center", "valign": "vcenter",
            "bold": True, "border": 1, "border_color": "#A6A6A6", "num_format": "0.00"}
    return {
        "titulo":               libro.add_format({"font_size": 9, "align": "center"}),
        "titulo_tabla":         libro.add_format({"font_size": 16, "align": "center", "bold": True}),
        "unidades_txt":         libro.add_format({"font_size": 11, "align": "center", "bold": True, "valign": "vcenter",
                                                   "bg_color": "#F2F2F2", "border_color": "#A6A6A6", "border": 1}),
        "lista_unidades_txt":   libro.add_format({"font_size": 9, "bg_color": "#F2F2F2", "border_color": "#A6A6A6",
                                                   "border": 1, "valign": "vcenter", "align": "center", "text_wrap": True}),
        "delegacion_txt":       libro.add_format({"font_size": 9, "bg_color": "#808080", "border_color": "#A6A6A6",
                                                   "border": 1, "valign": "vcenter", "align": "center", "text_wrap": True,
                                                   "bold": True, "font_color": "#FFFFFF"}),
        "encabezado_meses":     libro.add_format({"font_size": 11, "bg_color": "#F2F2F2", "border_color": "#A6A6A6",
                                                   "border": 1, "valign": "vcenter", "align": "center", "bold": True,
                                                   "font_color": "#3D3D3D"}),
        "color_celda1":         libro.add_format({"font_size": 9, "bg_color": "#f9f9f9", "border_color": "#A6A6A6",
                                                   "border": 1, "valign": "vcenter", "align": "center",
                                                   "text_wrap": True, "bold": True, "font_color": "#000000"}),
        "color_celda2":         libro.add_format({"font_size": 9, "bg_color": "#FFFFFF", "border_color": "#A6A6A6",
                                                   "border": 1, "valign": "vcenter", "align": "center",
                                                   "text_wrap": True, "bold": True, "font_color": "#000000"}),
        "titulo_iass06":        libro.add_format({"font_size": 11, "bold": True, "align": "center", "valign": "vcenter",
                                                   "border": 1, "border_color": "#A6A6A6",
                                                   "bg_color": "#F2F2F2", "font_color": "#3D3D3D"}),
        "header_grupo2":        libro.add_format({"font_size": 9, "bg_color": "#808080", "border_color": "#A6A6A6",
                                                   "border": 1, "valign": "vcenter", "align": "left", "bold": True,
                                                   "font_color": "#FFFFFF", "text_wrap": True}),
        "Verde":    libro.add_format({**_cap, "bg_color": _COLOR_VERDE,  "font_color": "white"}),
        "Amarillo": libro.add_format({**_cap, "bg_color": _COLOR_DORADO, "font_color": "white"}),
        "Rojo":     libro.add_format({**_cap, "bg_color": _COLOR_ROJO,   "font_color": "white"}),
        "sin_datos":libro.add_format({**_cap, "bg_color": "#CCCCCC",     "font_color": "black"}),
        # Igual que FTP: fondo gris, texto del color — no fondo sólido de color (esos son
        # para celdas de dato, estos son para el renglón de leyenda del umbral).
        "Verde_Leyenda":    libro.add_format({**_cap, "bg_color": "#F2F2F2", "font_color": _COLOR_VERDE}),
        "Amarillo_Leyenda": libro.add_format({**_cap, "bg_color": "#F2F2F2", "font_color": _COLOR_DORADO}),
        "Rojo_Leyenda":     libro.add_format({**_cap, "bg_color": "#F2F2F2", "font_color": _COLOR_ROJO}),
    }


_IAAS_UCI_CONFIG = {
    num: {
        "indicador": f"IAAS {num}",
        "codigo":   _CFG[f"IAAS {num}"]["Titulo2"],
        "titulo":   _CFG[f"IAAS {num}"]["Titulo1"],
        "hoja":     f"IAAS {num}",
        "sub_col1": _CFG[f"IAAS {num}"]["subT1"],
        "sub_col2": _CFG[f"IAAS {num}"]["subT2"],
        "alto_sub": 48 if num == "04" else 30,
    }
    for num in ("02", "03", "04", "05", "06")
}


def _rango_umbral_uci(indicador):
    """Umbral fijo de un indicador IAAS 02-06 (uno solo, no varía por unidad ni por mes) —
    mismo criterio de comparación que usa _color_tasa_uci, en formato de texto."""
    sem = _CFG[indicador].get("Semaforo", {})
    esp = sem.get("Esperado", {})
    med = sem.get("Medio", {})
    return {
        "verde":    f"{esp.get('Mayor', '?')} – {esp.get('Menor', '?')}",
        "amarillo": f"≥ {med.get('Mayor', '?')} – < {esp.get('Mayor', '?')}",
        "rojo":     f"< {med.get('Mayor', '?')}  ó  > {esp.get('Menor', '?')}",
    }


def _layout_iaas_uci():
    """
    Filas clave compartidas por _escribir_IAAS_UCI, _escribir_datos_IAAS_uci y
    _escribir_acumulado_IAAS_uci — un solo lugar, igual que _layout_iaas01, para que las
    tres funciones siempre coincidan (incluye la fila de OOAD de cada bloque).
    """
    N = len(UNIDADES_UCI)

    # "MENSUAL" lleva 3 filas de más (Verde/Amarillo/Rojo) pegadas arriba de sus encabezados,
    # igual que FTP — por eso +6 en vez de +3. Acumulado y Anual no llevan umbral, se quedan igual.
    fila_inicio_mensual = 1
    fila_hosp1_mensual  = fila_inicio_mensual + 6
    fila_fin_mensual     = fila_inicio_mensual + N + 5
    fila_delega_mensual  = fila_fin_mensual + 1

    fila_inicio_acumulado = fila_delega_mensual + 2
    fila_hosp1_acumulado  = fila_inicio_acumulado + 3
    fila_fin_acumulado     = fila_inicio_acumulado + N + 2
    fila_delega_acumulado  = fila_fin_acumulado + 1

    # Anual no tiene renglón de nombre de mes (con_fila_mes=False), por eso son 2 filas de
    # encabezado en vez de 3 antes de los datos.
    fila_inicio_anual = fila_delega_acumulado + 2
    fila_hosp1_anual  = fila_inicio_anual + 2
    fila_fin_anual     = fila_inicio_anual + N + 1
    fila_delega_anual  = fila_fin_anual + 1

    return {
        "fila_inicio_mensual":   fila_inicio_mensual,
        "fila_hosp1_mensual":    fila_hosp1_mensual,
        "fila_delega_mensual":   fila_delega_mensual,
        "fila_inicio_acumulado": fila_inicio_acumulado,
        "fila_hosp1_acumulado":  fila_hosp1_acumulado,
        "fila_delega_acumulado": fila_delega_acumulado,
        "fila_inicio_anual":     fila_inicio_anual,
        "fila_hosp1_anual":      fila_hosp1_anual,
        "fila_delega_anual":     fila_delega_anual,
    }


def _escribir_tabla_iass_uci(hoja, estilos, fila_inicio, etiqueta_seccion, cfg, meses=None, con_fila_mes=True, con_umbral=False):
    """meses=None → los 12 completos (bloque MENSUAL). Pasar MESES[1:] para omitir
    enero por completo (bloque MENSUAL ACUMULADO) — el bloque se angosta con él.
    con_fila_mes=False quita el renglón del nombre de mes (bloque ANUAL, que no tiene
    mes que mostrar) — sin eso, sobraba un renglón vacío entre el título y los datos.
    con_umbral=True agrega 3 filas (Verde/Amarillo/Rojo) pegadas arriba de los encabezados
    de cada mes, igual que hace FTP — solo tiene sentido en el bloque "MENSUAL"."""
    meses         = MESES if meses is None else meses
    COLS_MES      = 3
    ancho_bloque  = 1 + len(meses) * COLS_MES
    cant_unidades = len(UNIDADES_UCI)

    fila_seccion = fila_inicio
    if con_fila_mes:
        fila_mes  = fila_seccion + 1
        siguiente = fila_mes + 1
    else:
        fila_mes  = fila_seccion
        siguiente = fila_seccion + 1

    if con_umbral:
        fila_verde    = siguiente
        fila_amarillo = fila_verde + 1
        fila_rojo     = fila_amarillo + 1
        fila_sub      = fila_rojo + 1
    else:
        fila_sub = siguiente
    fila_hosp1 = fila_sub + 1

    hoja.write(fila_seccion, 0, "", estilos["titulo_iass06"])
    hoja.merge_range(fila_seccion, 1, fila_seccion, ancho_bloque - 1, etiqueta_seccion, estilos["titulo_iass06"])
    if con_fila_mes:
        hoja.merge_range(fila_mes, 0, fila_sub, 0, "UNIDADES", estilos["unidades_txt"])
    else:
        hoja.write(fila_sub, 0, "UNIDADES", estilos["unidades_txt"])
    hoja.set_row(fila_sub, cfg["alto_sub"])

    rango = _rango_umbral_uci(cfg["indicador"]) if con_umbral else None

    col = 1
    for mes in meses:
        if con_fila_mes:
            hoja.merge_range(fila_mes, col, fila_mes, col + 2, mes, estilos["encabezado_meses"])
        if con_umbral:
            hoja.merge_range(fila_verde,    col, fila_verde,    col + 2, f"VERDE: {rango['verde']}",       estilos["Verde_Leyenda"])
            hoja.merge_range(fila_amarillo, col, fila_amarillo, col + 2, f"AMARILLO: {rango['amarillo']}", estilos["Amarillo_Leyenda"])
            hoja.merge_range(fila_rojo,     col, fila_rojo,     col + 2, f"ROJO: {rango['rojo']}",         estilos["Rojo_Leyenda"])
        hoja.write(fila_sub, col,     cfg["sub_col1"], estilos["lista_unidades_txt"])
        hoja.write(fila_sub, col + 1, cfg["sub_col2"], estilos["lista_unidades_txt"])
        hoja.write(fila_sub, col + 2, "Tasa",          estilos["lista_unidades_txt"])
        col += COLS_MES

    for i, unidad in enumerate(UNIDADES_UCI):
        fila   = fila_hosp1 + i
        estilo = estilos["color_celda1"] if i % 2 == 0 else estilos["color_celda2"]
        hoja.write(fila, 0, unidad, estilos["lista_unidades_txt"])
        for c in range(1, ancho_bloque):
            hoja.write(fila, c, "", estilo)

    return fila_hosp1 + cant_unidades - 1


def _escribir_IAAS_UCI(libro, estilos, numero: str):
    cfg        = _IAAS_UCI_CONFIG[numero]
    COLS_MES   = 3
    TOTAL_COLS = 1 + 12 * COLS_MES
    layout     = _layout_iaas_uci()

    hoja = libro.add_worksheet(cfg["hoja"])
    hoja.set_column(0, 0, 32)
    hoja.freeze_panes(0, 1)
    hoja.set_column(1, TOTAL_COLS - 1, 9)
    for m in range(12):
        hoja.set_column(2 + m * COLS_MES, 2 + m * COLS_MES, 14)
    hoja.set_default_row(20)
    libro.formats[0].set_font_name("Calibri")

    hoja.merge_range(0, 0, 0, TOTAL_COLS - 1, cfg["titulo"], estilos["titulo_iass06"])

    def _fila_ooad(fila, ancho):
        hoja.write(fila, 0, "OOAD", estilos["delegacion_txt"])
        for c in range(1, ancho):
            hoja.write(fila, c, "", estilos["delegacion_txt"])

    _escribir_tabla_iass_uci(hoja, estilos, layout["fila_inicio_mensual"], "MENSUAL", cfg, meses=MESES, con_umbral=True)
    _fila_ooad(layout["fila_delega_mensual"], TOTAL_COLS)

    # "MENSUAL ACUMULADO" sin enero — el bloque arranca directo en febrero, más angosto.
    _escribir_tabla_iass_uci(hoja, estilos, layout["fila_inicio_acumulado"], "MENSUAL ACUMULADO", cfg, meses=MESES[1:])
    _fila_ooad(layout["fila_delega_acumulado"], 1 + len(MESES[1:]) * COLS_MES)

    # "ANUAL": sin renglón de mes (no tiene mes que mostrar) — directo del título a los datos.
    _escribir_tabla_iass_uci(hoja, estilos, layout["fila_inicio_anual"], "ANUAL", cfg, meses=[""], con_fila_mes=False)
    _fila_ooad(layout["fila_delega_anual"], 1 + COLS_MES)


def _Excel_IAAS_UCI(numero: str, anio: str = None) -> io.BytesIO:
    salida  = io.BytesIO()
    libro   = xlsxwriter.Workbook(salida)
    libro.set_properties({'author': 'Web CIAE'})
    estilos = Estilos_IAAS01(libro)
    _escribir_IAAS_UCI(libro, estilos, numero)

    if anio:
        clave      = f"IAAS {numero}"
        hoja       = libro.get_worksheet_by_name(clave)
        all_months = dict(_leer_historicos_IAAS(anio, 0).get(clave, {}))
        for m, mes_datos in all_months.items():
            _escribir_datos_IAAS_uci(hoja, estilos, m, mes_datos, clave)
        _escribir_acumulado_IAAS_uci(hoja, estilos, all_months, clave)
        _escribir_anual_IAAS_uci(hoja, estilos, all_months, clave)

    libro.close()
    salida.seek(0)
    return salida


def Excel_IAAS02(anio: str = None): return _Excel_IAAS_UCI("02", anio)
def Excel_IAAS03(anio: str = None): return _Excel_IAAS_UCI("03", anio)
def Excel_IAAS04(anio: str = None): return _Excel_IAAS_UCI("04", anio)
def Excel_IAAS05(anio: str = None): return _Excel_IAAS_UCI("05", anio)
def Excel_IAAS06(anio: str = None): return _Excel_IAAS_UCI("06", anio)


def _estilo_tasa(estilos, color):
    return estilos.get(color, estilos["sin_datos"])


def _acumular_unidad(all_months, unidad, hasta_mes):
    """Suma numerador/denominador de una unidad desde enero hasta hasta_mes (inclusive).
    Reutilizado por el acumulado mensual y por el bloque Anual (que es lo mismo, solo que
    siempre hasta el último mes que haya)."""
    num, den, tiene = 0, 0, False
    for m in range(1, hasta_mes + 1):
        v = _dato_unidad(all_months.get(m, {}), unidad)
        if v:
            num  += v.get("numerador") or 0
            den  += v.get("denominador") or 0
            tiene = True
    return num, den, tiene


def _escribir_acumulado_IAAS01(hoja, estilos, all_months):
    N = len(UNIDADES_IAAS)
    # Bloque "MENSUAL ACUMULADO": la fila se calcula del layout compartido, no es un número fijo.
    # Enero no tiene columna en este bloque (acumulado de enero = enero, no aporta nada nuevo) —
    # febrero es la primera columna, por eso el -2 en vez de -1.
    fila_inicio = _layout_iaas01()["fila_inicio_acumulado"]

    for mes_target in range(2, 13):
        if mes_target not in all_months:
            continue

        col_base = 1 + (mes_target - 2) * 4

        sum_del_n = 0
        sum_del_d = 0

        for i, unidad in enumerate(UNIDADES_IAAS):
            if unidad == "DELEGACION":
                continue

            acum_num, acum_den, tiene = _acumular_unidad(all_months, unidad, mes_target)

            if not tiene:
                continue

            fila   = fila_inicio + i
            estilo = estilos["color_celda1"] if i % 2 == 0 else estilos["color_celda2"]
            tasa   = round((acum_num / acum_den) * 1000, 2) if acum_den else 0
            color  = _color_tasa_01(tasa, unidad)

            hoja.write(fila, col_base + 1, acum_num, estilo)
            hoja.write(fila, col_base + 2, acum_den, estilo)
            hoja.write(fila, col_base + 3, tasa, _estilo_tasa(estilos, color))

            sum_del_n += acum_num
            sum_del_d += acum_den

        fila_del  = fila_inicio + N - 1
        tasa_del  = round((sum_del_n / sum_del_d) * 1000, 2) if sum_del_d else 0
        color_del = _color_tasa_01(tasa_del, "DELEGACION")
        est_del   = estilos["delegacion_txt"]
        hoja.write(fila_del, col_base + 1, sum_del_n, est_del)
        hoja.write(fila_del, col_base + 2, sum_del_d, est_del)
        hoja.write(fila_del, col_base + 3, tasa_del,  _estilo_tasa(estilos, color_del))


def _escribir_anual_IAAS01(hoja, estilos, all_months):
    """Bloque 'ANUAL': el acumulado Ene→último mes registrado, la misma cuenta que ya
    hace _escribir_acumulado_IAAS01 para su última columna, pero puesta aparte para
    verse de un vistazo sin tener que ir hasta el final del bloque mensual acumulado."""
    if not all_months:
        return
    N           = len(UNIDADES_IAAS)
    fila_inicio = _layout_iaas01()["fila_inicio_anual"]
    hasta_mes   = max(all_months.keys())
    col_base    = 1

    sum_n, sum_d = 0, 0
    for i, unidad in enumerate(UNIDADES_IAAS):
        if unidad == "DELEGACION":
            continue

        num, den, tiene = _acumular_unidad(all_months, unidad, hasta_mes)
        if not tiene:
            continue

        fila   = fila_inicio + i
        estilo = estilos["color_celda1"] if i % 2 == 0 else estilos["color_celda2"]
        tasa   = round((num / den) * 1000, 2) if den else 0
        color  = _color_tasa_01(tasa, unidad)

        hoja.write(fila, col_base + 1, num,  estilo)
        hoja.write(fila, col_base + 2, den,  estilo)
        hoja.write(fila, col_base + 3, tasa, _estilo_tasa(estilos, color))

        sum_n += num
        sum_d += den

    fila_del  = fila_inicio + N - 1
    tasa_del  = round((sum_n / sum_d) * 1000, 2) if sum_d else 0
    color_del = _color_tasa_01(tasa_del, "DELEGACION")
    est_del   = estilos["delegacion_txt"]
    hoja.write(fila_del, col_base + 1, sum_n,    est_del)
    hoja.write(fila_del, col_base + 2, sum_d,    est_del)
    hoja.write(fila_del, col_base + 3, tasa_del, _estilo_tasa(estilos, color_del))


def _escribir_acumulado_IAAS_uci(hoja, estilos, all_months, indicador):
    layout   = _layout_iaas_uci()
    fila_ini = layout["fila_hosp1_acumulado"]
    fila_del = layout["fila_delega_acumulado"]

    sem       = _CFG[indicador].get("Semaforo", {})
    tasa_mult = sem.get("Tasa", 1000)

    # Enero no tiene columna en este bloque (acumulado de enero = enero, no aporta nada nuevo) —
    # febrero es la primera columna, por eso el -2 en vez de -1. Mismo criterio que IAAS 01.
    for mes_target in range(2, 13):
        if mes_target not in all_months:
            continue

        col_base  = 1 + (mes_target - 2) * 3
        sum_del_n = 0
        sum_del_d = 0

        for i, unidad in enumerate(UNIDADES_UCI):
            acum_num = 0
            acum_den = 0
            tiene    = False
            for m in range(1, mes_target + 1):
                v = _dato_unidad(all_months.get(m, {}), unidad)
                if v:
                    acum_num += v.get("numerador") or 0
                    acum_den += v.get("denominador") or 0
                    tiene = True

            if not tiene:
                continue

            fila   = fila_ini + i
            estilo = estilos["color_celda1"] if i % 2 == 0 else estilos["color_celda2"]
            tasa   = round((acum_num / acum_den) * tasa_mult, 2) if acum_den else 0
            color  = _color_tasa_uci(tasa, indicador)

            hoja.write(fila, col_base,     acum_num, estilo)
            hoja.write(fila, col_base + 1, acum_den, estilo)
            hoja.write(fila, col_base + 2, tasa,     _estilo_tasa(estilos, color))

            sum_del_n += acum_num
            sum_del_d += acum_den

        tasa_del  = round((sum_del_n / sum_del_d) * tasa_mult, 2) if sum_del_d else 0
        color_del = _color_tasa_uci(tasa_del, indicador)
        est_del   = estilos["delegacion_txt"]
        hoja.write(fila_del, col_base,     sum_del_n, est_del)
        hoja.write(fila_del, col_base + 1, sum_del_d, est_del)
        hoja.write(fila_del, col_base + 2, tasa_del,  _estilo_tasa(estilos, color_del))


def _escribir_anual_IAAS_uci(hoja, estilos, all_months, indicador):
    """Bloque 'ANUAL': acumulado Ene→último mes registrado, mismo criterio que
    _escribir_anual_IAAS01 pero para IAAS 02-06 (OOAD es fila aparte, no de la lista)."""
    if not all_months:
        return
    layout    = _layout_iaas_uci()
    fila_ini  = layout["fila_hosp1_anual"]
    fila_del  = layout["fila_delega_anual"]
    hasta_mes = max(all_months.keys())
    col_base  = 1

    sem       = _CFG[indicador].get("Semaforo", {})
    tasa_mult = sem.get("Tasa", 1000)

    sum_n, sum_d = 0, 0
    for i, unidad in enumerate(UNIDADES_UCI):
        num, den, tiene = _acumular_unidad(all_months, unidad, hasta_mes)
        if not tiene:
            continue

        fila   = fila_ini + i
        estilo = estilos["color_celda1"] if i % 2 == 0 else estilos["color_celda2"]
        tasa   = round((num / den) * tasa_mult, 2) if den else 0
        color  = _color_tasa_uci(tasa, indicador)

        hoja.write(fila, col_base,     num,  estilo)
        hoja.write(fila, col_base + 1, den,  estilo)
        hoja.write(fila, col_base + 2, tasa, _estilo_tasa(estilos, color))

        sum_n += num
        sum_d += den

    tasa_del  = round((sum_n / sum_d) * tasa_mult, 2) if sum_d else 0
    color_del = _color_tasa_uci(tasa_del, indicador)
    est_del   = estilos["delegacion_txt"]
    hoja.write(fila_del, col_base,     sum_n,    est_del)
    hoja.write(fila_del, col_base + 1, sum_d,    est_del)
    hoja.write(fila_del, col_base + 2, tasa_del, _estilo_tasa(estilos, color_del))


def _escribir_datos_IAAS_uci(hoja, estilos, mes_num, datos, indicador):
    layout    = _layout_iaas_uci()
    col_base  = 1 + (mes_num - 1) * 3
    sem       = _CFG[indicador].get("Semaforo", {})
    tasa_mult = sem.get("Tasa", 1000)
    sum_n, sum_d = 0, 0

    for i, unidad in enumerate(UNIDADES_UCI):
        v      = _dato_unidad(datos, unidad)
        fila   = layout["fila_hosp1_mensual"] + i
        estilo = estilos["color_celda1"] if i % 2 == 0 else estilos["color_celda2"]
        color  = (v.get("color") if v else None) or "Gris"

        if color == "Gris":
            # dato incompleto -- se muestra el numerador o denominador que sí tenga valor
            # (el que sea None se deja vacio) con su estilo normal; solo la tasa se deja
            # vacia y en gris. No se cuenta en el total de OOAD.
            num  = v.get("numerador") if v else None
            den  = v.get("denominador") if v else None
            hoja.write(fila, col_base,     num if num is not None else "", estilo)
            hoja.write(fila, col_base + 1, den if den is not None else "", estilo)
            hoja.write(fila, col_base + 2, "", _estilo_tasa(estilos, "Gris"))
            continue

        num  = v.get("numerador")
        den  = v.get("denominador")
        tasa = v.get("tasa")
        hoja.write(fila, col_base,     num,  estilo)
        hoja.write(fila, col_base + 1, den,  estilo)
        hoja.write(fila, col_base + 2, tasa, _estilo_tasa(estilos, color))
        sum_n += num or 0
        sum_d += den or 0

    # Fila OOAD del bloque MENSUAL — antes no se calculaba (solo existía en el acumulado).
    fila_ooad  = layout["fila_delega_mensual"]
    tasa_ooad  = round((sum_n / sum_d) * tasa_mult, 2) if sum_d else 0
    color_ooad = _color_tasa_uci(tasa_ooad, indicador)
    est_ooad   = estilos["delegacion_txt"]
    hoja.write(fila_ooad, col_base,     sum_n,     est_ooad)
    hoja.write(fila_ooad, col_base + 1, sum_d,     est_ooad)
    hoja.write(fila_ooad, col_base + 2, tasa_ooad, _estilo_tasa(estilos, color_ooad))


def _escribir_datos_IAAS01(hoja, estilos, mes_num, datos):
    N = len(UNIDADES_IAAS)
    # Bloque "MENSUAL": la fila se calcula del layout compartido, no es un número fijo.
    fila_inicio = _layout_iaas01()["fila_inicio_mensual"]
    col_base    = 1 + (mes_num - 1) * 4

    # El OOAD suma exactamente las mismas unidades que se muestran como fila —ni una más—,
    # buscando con alias HGS/HGSZ por si el dato crudo trae el prefijo distinto.
    sum_num = 0
    sum_den = 0
    for unidad in UNIDADES_IAAS:
        if unidad == "DELEGACION":
            continue
        v = _dato_unidad(datos, unidad)
        if v and (v.get("color") or "Gris") != "Gris":
            sum_num += v.get("numerador") or 0
            sum_den += v.get("denominador") or 0
    tasa_deleg = round((sum_num / sum_den) * 1000, 2) if sum_den else 0

    for i, unidad in enumerate(UNIDADES_IAAS):
        fila = fila_inicio + i

        if unidad == "DELEGACION":
            est         = estilos["delegacion_txt"]
            color_deleg = datos.get("DELEGACION", {}).get("color") if isinstance(datos.get("DELEGACION"), dict) else _color_tasa_01(tasa_deleg, "DELEGACION")
            hoja.write(fila, col_base + 1, sum_num,    est)
            hoja.write(fila, col_base + 2, sum_den,    est)
            hoja.write(fila, col_base + 3, tasa_deleg, _estilo_tasa(estilos, color_deleg))
            continue

        v = _dato_unidad(datos, unidad)
        if not v:
            continue
        estilo = estilos["color_celda1"] if i % 2 == 0 else estilos["color_celda2"]
        color  = v.get("color") or "Gris"
        if color == "Gris":
            # dato incompleto -- se muestra el numerador o denominador que sí tenga valor
            # (el que sea None se deja vacio) con su estilo normal; solo la tasa se deja
            # vacia y en gris.
            num  = v.get("numerador")
            den  = v.get("denominador")
            hoja.write(fila, col_base + 1, num if num is not None else "", estilo)
            hoja.write(fila, col_base + 2, den if den is not None else "", estilo)
            hoja.write(fila, col_base + 3, "", _estilo_tasa(estilos, "Gris"))
            continue

        num  = v.get("numerador")
        den  = v.get("denominador")
        tasa = v.get("tasa")
        hoja.write(fila, col_base + 1, num,  estilo)
        hoja.write(fila, col_base + 2, den,  estilo)
        hoja.write(fila, col_base + 3, tasa, _estilo_tasa(estilos, color))


def Excel_IAAS_Completo(anio: str, mes: str, datos: dict) -> io.BytesIO:
    mes_num      = int(mes)
    ruta_archivo = RUTA_BASE_IAAS / str(anio) / f"IAAS_{anio}.xlsx"
    historicos   = _leer_historicos_IAAS(anio, mes_num)

    salida  = io.BytesIO()
    libro   = xlsxwriter.Workbook(salida)
    libro.set_properties({'author': 'Web CIAE'})
    estilos = Estilos_IAAS01(libro)

    _escribir_IAAS01(libro, estilos)
    for num in ("02", "03", "04", "05", "06"):
        _escribir_IAAS_UCI(libro, estilos, num)

    hoja01 = libro.get_worksheet_by_name("IAAS 01")
    if hoja01:
        all_months_01 = dict(historicos.get("IAAS 01", {}))
        for m, mes_datos in all_months_01.items():
            _escribir_datos_IAAS01(hoja01, estilos, m, mes_datos)
        if datos.get("IAAS 01"):
            all_months_01[mes_num] = datos["IAAS 01"]
            _escribir_datos_IAAS01(hoja01, estilos, mes_num, datos["IAAS 01"])
        _escribir_acumulado_IAAS01(hoja01, estilos, all_months_01)
        _escribir_anual_IAAS01(hoja01, estilos, all_months_01)

    for num in ("02", "03", "04", "05", "06"):
        key  = f"IAAS {num}"
        hoja = libro.get_worksheet_by_name(key)
        if not hoja:
            continue

        all_months = dict(historicos.get(key, {}))
        if datos.get(key):
            all_months[mes_num] = datos[key]

        for m, mes_datos in all_months.items():
            _escribir_datos_IAAS_uci(hoja, estilos, m, mes_datos, key)

        _escribir_acumulado_IAAS_uci(hoja, estilos, all_months, key)
        _escribir_anual_IAAS_uci(hoja, estilos, all_months, key)

    libro.close()
    salida.seek(0)

    ruta_archivo.parent.mkdir(parents=True, exist_ok=True)
    try:
        with open(ruta_archivo, "wb") as f:
            f.write(salida.read())
        salida.seek(0)
        print(f"[IAAS] Guardado: {ruta_archivo}")
    except PermissionError:
        salida.seek(0)
        raise PermissionError(f"El archivo IAAS_{anio}.xlsx está abierto en Excel. Ciérralo e intenta de nuevo.")

    return salida
