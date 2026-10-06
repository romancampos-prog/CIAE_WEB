"""
Dibujante estandar de la hoja de un indicador (FTP y Extractor): estilos del libro y
la pestana con encabezado, leyendas del semaforo y una fila por unidad. Recibe los
datos ya leidos (incluido el historico de meses); no lee la BD.
Usado en: services/excel_Services.py
"""
import re

import xlsxwriter

from shared.unidades_ftp import NOMBREUNIDADESARCHIVO, UNIDADES_FINALES, UNIDADES_PREVIOS
from shared.MESES import MESES_ESTANDAR as MESES_LISTA
from shared.reglas_periodicidad import descripcion_periodicidad, indices_de_meses
from shared.semaforo_service import evaluar_color, numero_de_umbral


def _es_descendente(limites: dict) -> bool:
    """
    True si "menor es mejor" para este semaforo (hay que compararlo contra el
    umbral con <=, no >=). Dos formatos posibles:
      - Legado: clave "Alto" presente (ej. IAAS) en vez de "Bajo".
      - Explicito (EH 03, DM 04, etc.): el valor de "Esperado" ya trae el
        operador como texto, ej. "<= 17.38" -- ahi se lee el operador
        directo, sin necesidad de la clave "Alto".
    """
    if "Alto" in limites:
        return True
    esperado = limites.get("Esperado")
    return isinstance(esperado, str) and esperado.strip().startswith(("<=", "<"))


def _texto_medio(v_esp, v_critico, descendente) -> str:
    """
    Texto de la leyenda MEDIO -- vacio si Esperado y el umbral critico son el
    mismo numero (semaforo binario, sin nivel Medio real -- ej. "Medio": null
    en el mapeo, como EH 03/DM 04). Sin esto se imprimia un rango vacio/
    imposible (ej. "MEDIO: > 67.53 y < 67.53") que da a entender que existe
    un nivel Medio aunque nunca se use.
    """
    if v_esp == v_critico:
        return ""
    return f"MEDIO: > {v_esp} y < {v_critico}" if descendente else f"MEDIO: < {v_esp} y > {v_critico}"


def _es_rango_compuesto(texto) -> bool:
    """Umbral de dos lados en el mapeo, ej. ">= 5.0 a <= 8.0" o "<= 3.9 o >= 10.0" (MT 03)."""
    return isinstance(texto, str) and len(re.findall(r"\d+(?:\.\d+)?", texto)) > 1


def _leyendas_semaforo(limites: dict) -> tuple[str, str, str]:
    """
    Textos (ESPERADO, MEDIO, BAJO/ALTO) de la leyenda. Con umbrales de un solo
    numero se arman como siempre; si alguno es de dos lados, se escribe el rango
    tal cual viene en el mapeo -- si no, "ESPERADO: >= 5.0" se comia el "<= 8.0".
    """
    clave_critica = "Alto" if "Alto" in limites else "Bajo"
    # Solo Esperado/Bajo deciden: el Medio de casi todos ya es de dos lados ("> 12 a < 16").
    if any(_es_rango_compuesto(limites.get(c)) for c in ("Esperado", clave_critica)):
        legible = lambda c: str(limites.get(c) or "").replace(" a ", " y ").strip()
        medio = legible("Medio")
        return (f"ESPERADO: {legible('Esperado')}", f"MEDIO: {medio}" if medio else "",
                f"{clave_critica.upper()}: {legible(clave_critica)}")

    v_esp       = numero_de_umbral(limites.get("Esperado", 0))
    v_critico   = numero_de_umbral(limites.get(clave_critica, 0))
    descendente = _es_descendente(limites)
    if descendente:
        return f"ESPERADO: <= {v_esp}", _texto_medio(v_esp, v_critico, True), f"{clave_critica.upper()}: >= {v_critico}"
    return f"ESPERADO: >= {v_esp}", _texto_medio(v_esp, v_critico, False), f"BAJO: <= {v_critico}"


def _calcular_color(valor, idx_mes, indicadorSemaforo):
    MESES_LISTA = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                   "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    if valor == "" or valor is None:
        return 'Gris'
    try:
        val     = float(valor)
        limites = indicadorSemaforo.get(MESES_LISTA[idx_mes], indicadorSemaforo)
        return evaluar_color(val, limites)
    except Exception:
        return 'Gris'


def _estilo_valor(fmt, clave_base, valor):
    """Formato de una celda de numerador/denominador dentro de una fila Gris.
    Si el valor sí existe (no None/""), usa la variante gris RGB(49,134,155)
    bold del mismo formato base -- mismo fondo/borde, solo marca que no se
    contó en el total."""
    if valor not in (None, ""):
        return fmt.get(f"{clave_base}_incompleto", fmt[clave_base])
    return fmt[clave_base]


def obtener_estilos_excel(workbook):
    C_VERDE       = '#0B5445'
    C_DORADO      = '#9A7026'
    C_ROJO        = "#7E0808"
    C_GRIS_FONDOS = '#F2F2F2'
    C_GRIS_TOTAL  = '#808080'
    C_BORDE       = '#D1D1D1'

    base = {
        'font_name': 'Calibri', 'font_size': 11, 'valign': 'vcenter',
        'border': 1, 'border_color': C_BORDE, 'align': 'center'
    }

    return {
        'titulo_izq':            workbook.add_format({**base, 'bold': True, 'font_size': 16, 'font_color': C_VERDE, 'border': 0, 'align': 'left'}),
        'nota_completas':        workbook.add_format({'font_name': 'Calibri', 'font_size': 14, 'bold': True, 'align': 'center'}),
        'etiqueta_bold':         workbook.add_format({**base, 'bold': True, 'bg_color': C_GRIS_FONDOS, 'align': 'left'}),
        'descripcion':           workbook.add_format({**base, 'text_wrap': True, 'font_color': '#444444', 'align': 'left'}),
        'columna_unidad_header': workbook.add_format({**base, 'bold': True, 'bg_color': C_GRIS_FONDOS}),
        'columna_unidad_dato':   workbook.add_format({**base, 'bg_color': C_GRIS_FONDOS}),
        'subtitulo':             workbook.add_format({**base, 'bold': True, 'bg_color': C_GRIS_FONDOS, 'font_color': '#444444'}),
        'header_sub':            workbook.add_format({**base, 'bold': True, 'bg_color': C_GRIS_FONDOS, 'font_size': 9}),
        'Esperado_Leyenda':      workbook.add_format({**base, 'bg_color': C_GRIS_FONDOS, 'font_color': C_VERDE,  'bold': True}),
        'Medio_Leyenda':         workbook.add_format({**base, 'bg_color': C_GRIS_FONDOS, 'font_color': C_DORADO, 'bold': True}),
        'Bajo_Leyenda':          workbook.add_format({**base, 'bg_color': C_GRIS_FONDOS, 'font_color': C_ROJO,   'bold': True}),
        'dato_normal':           workbook.add_format({**base, 'num_format': '#,##0'}),
        'fila_par':              workbook.add_format({**base, 'bg_color': '#F9F9F9', 'num_format': '#,##0'}),
        # Idénticos a dato_normal/fila_par -- solo cambia font_color a gris
        # RGB(49,134,155) bold: un numerador o denominador que sí existe en una
        # fila Gris, pero que no se contó en el total (mismo criterio que IAAS).
        'dato_normal_incompleto': workbook.add_format({**base, 'num_format': '#,##0', 'font_color': '#31869B', 'bold': True}),
        'fila_par_incompleto':    workbook.add_format({**base, 'bg_color': '#F9F9F9', 'num_format': '#,##0', 'font_color': '#31869B', 'bold': True}),
        'total_gris_80':         workbook.add_format({**base, 'bold': True, 'bg_color': C_GRIS_TOTAL, 'font_color': 'white', 'num_format': '#,##0'}),
        'Esperado_Capsula':      workbook.add_format({**base, 'bg_color': C_VERDE,   'font_color': 'white', 'bold': True, 'num_format': '0.00'}),
        'Medio_Capsula':         workbook.add_format({**base, 'bg_color': C_DORADO,  'font_color': 'white', 'bold': True, 'num_format': '0.00'}),
        'Bajo_Capsula':          workbook.add_format({**base, 'bg_color': C_ROJO,    'font_color': 'white', 'bold': True, 'num_format': '0.00'}),
        'Gris_Capsula':          workbook.add_format({**base, 'bg_color': '#CCCCCC', 'font_color': 'black', 'bold': True, 'num_format': '0.00'}),
        'poblacion_leyenda':     workbook.add_format({'font_name': 'Calibri', 'font_size': 9, 'italic': True, 'font_color': '#888888', 'align': 'left', 'border': 0}),
        # Barra que separa el bloque "MENSUAL ACUMULADO" (igual idea que la barra de IAAS).
        'titulo_seccion':        workbook.add_format({**base, 'bold': True, 'font_size': 12, 'bg_color': C_VERDE, 'font_color': 'white', 'align': 'left'}),
    }


def _escribir_encabezado_meses(ws, fmt, r, checkpoints, semaforo, etiqueta_mes) -> None:
    """Fila r: nombre de cada columna de mes; r+1..r+3: leyenda del semaforo; r+4: NUM / DEN / %."""
    ws.merge_range(r, 0, r + 4, 0, "UNIDAD MEDICA", fmt['columna_unidad_header'])
    for pos, idx_real in enumerate(checkpoints):
        nombre_m = MESES_LISTA[idx_real]
        sc = pos * 3 + 1
        ws.merge_range(r, sc, r, sc + 2, etiqueta_mes(idx_real), fmt['subtitulo'])

        # cada mes con su propio semaforo (puede variar por mes)
        texto_esp, texto_medio, texto_critico = _leyendas_semaforo(semaforo.get(nombre_m, semaforo))
        ws.merge_range(r + 1, sc, r + 1, sc + 2, texto_esp,     fmt['Esperado_Leyenda'])
        ws.merge_range(r + 2, sc, r + 2, sc + 2, texto_medio,   fmt['Medio_Leyenda'])
        ws.merge_range(r + 3, sc, r + 3, sc + 2, texto_critico, fmt['Bajo_Leyenda'])

        ws.write(r + 4, sc,     "NUM", fmt['header_sub'])
        ws.write(r + 4, sc + 1, "DEN", fmt['header_sub'])
        ws.write(r + 4, sc + 2, "%",   fmt['header_sub'])


def _nombre_oficial(unidad_id: str, lista_tecnica: list) -> str:
    if unidad_id == "TOTAL_OOAD":
        return "TOTAL"
    try:
        return NOMBREUNIDADESARCHIVO[lista_tecnica.index(unidad_id)]
    except Exception:
        return unidad_id


def _escribir_celdas_mes(ws, fmt, fila, col, clave_base, num, den, res, color) -> None:
    """NUM / DEN / % de una unidad en un mes. Sin resultado (Gris = dato incompleto) se muestra
    el numerador o denominador que si tenga valor en gris RGB(49,134,155) bold, para marcar que
    no se conto en el total; el % se deja vacio y en gris."""
    num = None if num in (None, "") else num
    den = None if den in (None, "") else den
    if res in (None, ""):
        ws.write(fila, col,     num if num is not None else "", _estilo_valor(fmt, clave_base, num))
        ws.write(fila, col + 1, den if den is not None else "", _estilo_valor(fmt, clave_base, den))
        ws.write(fila, col + 2, "", fmt.get("Gris_Capsula", fmt['dato_normal']))
    else:
        ws.write(fila, col,     num, fmt[clave_base])
        ws.write(fila, col + 1, den, fmt[clave_base])
        ws.write(fila, col + 2, res, fmt.get(f"{color}_Capsula", fmt['dato_normal']))


def _clave_base_fila(idx_fila: int, es_total: bool) -> str:
    return 'total_gris_80' if es_total else ('fila_par' if idx_fila % 2 == 0 else 'dato_normal')


def _escribir_bloque_acumulado(ws, fmt, fila_titulo, ultima_col, checkpoints, semaforo,
                               acumulado_por_mes: dict[int, dict], unidades: list, lista_tecnica: list,
                               idx_mes_activo: int) -> None:
    """
    Debajo de la tabla mensual: "MENSUAL ACUMULADO" con el mismo formato (unidades x meses,
    NUM/DEN/% y semaforo), cada columna sumando desde Enero ("ENERO", "ENERO - FEBRERO"...).
    Mismo orden de unidades que la tabla mensual; meses posteriores al activo, en blanco.
    """
    ws.merge_range(fila_titulo, 0, fila_titulo, ultima_col,
                   "  MENSUAL ACUMULADO  ·  cada columna suma desde enero hasta ese mes", fmt['titulo_seccion'])
    r = fila_titulo + 1
    _escribir_encabezado_meses(ws, fmt, r, checkpoints, semaforo,
                               lambda i: "ENERO" if i == 0 else f"ENERO - {MESES_LISTA[i].upper()}")

    for idx_fila, unidad_id in enumerate(unidades):
        fila_excel = r + 5 + idx_fila
        es_total   = unidad_id == "TOTAL_OOAD"
        clave_base = _clave_base_fila(idx_fila, es_total)
        ws.write(fila_excel, 0, _nombre_oficial(unidad_id, lista_tecnica),
                 fmt['total_gris_80'] if es_total else fmt['columna_unidad_dato'])
        for pos, idx_real in enumerate(checkpoints):
            col   = pos * 3 + 1
            datos = acumulado_por_mes.get(idx_real, {}).get(unidad_id) if idx_real <= idx_mes_activo else None
            if datos:
                _escribir_celdas_mes(ws, fmt, fila_excel, col, clave_base,
                                     datos.get("numerador"), datos.get("denominador"), datos.get("resultado"), datos.get("color", "Gris"))
            else:
                for i in range(3):
                    ws.write(fila_excel, col + i, "", fmt[clave_base])


def escribir_hoja_indicador(wb: xlsxwriter.Workbook, fmt: dict,
                             indicador: str, diccionarioPrevio: dict,
                             metadata: dict, ano: str, mes: str,
                             semana, es_semana: bool, historicos: dict,
                             poblacion_por_mes: dict[int, str | None] | None = None,
                             acumulado_por_mes: dict[int, dict] | None = None):
    titulo       = metadata["titulo"] or ""
    desNum       = metadata["desNum"] or ""
    desDen       = metadata["desDen"] or ""
    arch         = metadata["arch"]   or indicador
    semaforo     = metadata["semaforo"]
    periodicidad = metadata.get("periodicidad")

    idx_mes_activo = int(mes) - 1

    checkpoints = indices_de_meses(periodicidad)
    ultima_col = len(checkpoints) * 3


    # El mes (y la semana, si aplica) siempre van en el nombre de la pestaña
    # -- no en el nombre del archivo -- porque ahora cada indicador de la
    # categoría trae su propio último mes disponible (ver
    # preparar_datos_guardados), así que dos pestañas de la misma descarga
    # bien pueden ser de meses distintos entre sí; sin esto no se podría
    # saber de qué mes es cada una a simple vista.
    abrev_mes   = MESES_LISTA[idx_mes_activo][:3].upper()
    nombre_hoja = f"{indicador} - {abrev_mes} S{semana}" if es_semana and semana else f"{indicador} - {abrev_mes}"
    ws = wb.add_worksheet(nombre_hoja[:31])
    ws.hide_gridlines(2)
    ws.set_column(0, 0, 37)
    ws.set_column(1, ultima_col, 14)
    ws.set_default_row(20)
    ws.freeze_panes(0, 1)  # columna A (unidad) fija al deslizar de izquierda a derecha

    ws.merge_range(0, 0, 0, ultima_col, "NOTA: SOLO SE HACE SUMATORIA DE LAS UNIDADES COMPLETAS", fmt['nota_completas'])
    ws.merge_range(1, 1, 1, ultima_col, titulo.upper(), fmt['titulo_izq'])
    ws.write(3, 0, "  NUMERADOR",   fmt['etiqueta_bold'])
    ws.merge_range(3, 1, 3, ultima_col, f"  {desNum.upper()}", fmt['descripcion'])
    ws.write(4, 0, "  DENOMINADOR", fmt['etiqueta_bold'])
    ws.merge_range(4, 1, 4, ultima_col, f"  {desDen.upper()}", fmt['descripcion'])

    # Con periodicidad se agrega una fila mas (igual que NUMERADOR/DENOMINADOR);
    # r es la fila del encabezado de meses, todo lo de abajo se recorre con ella.
    texto_periodicidad = descripcion_periodicidad(periodicidad)
    r = 6 if texto_periodicidad else 5
    if texto_periodicidad:
        ws.write(5, 0, "  PERIODICIDAD", fmt['etiqueta_bold'])
        ws.merge_range(5, 1, 5, ultima_col, f"  {texto_periodicidad.upper()}", fmt['descripcion'])
    _escribir_encabezado_meses(ws, fmt, r, checkpoints, semaforo, lambda i: MESES_LISTA[i].upper())

    ultima_fila   = r + 5 + len(diccionarioPrevio) - 1
    lista_tecnica = UNIDADES_PREVIOS if es_semana else UNIDADES_FINALES
    ws.autofilter(r + 4, 0, ultima_fila, 0)

    for idx_fila, unidad_id in enumerate(diccionarioPrevio.keys()):
        fila_excel = idx_fila + r + 5
        es_total   = (unidad_id == "TOTAL_OOAD")
        clave_base = _clave_base_fila(idx_fila, es_total)

        ws.write(fila_excel, 0, _nombre_oficial(unidad_id, lista_tecnica),
                 fmt['total_gris_80'] if es_total else fmt['columna_unidad_dato'])

        for pos, idx_real in enumerate(checkpoints):
            col = pos * 3 + 1

            if idx_real == idx_mes_activo:
                reg = diccionarioPrevio[unidad_id]
                _escribir_celdas_mes(ws, fmt, fila_excel, col, clave_base,
                                     reg.get("numerador"), reg.get("denominador"), reg.get("resultado"), reg.get('color', 'Gris'))
            elif idx_real < idx_mes_activo and historicos.get(unidad_id, {}).get(idx_real):
                # Meses anteriores: el color se recalcula con el semaforo de ESE mes.
                hist  = historicos[unidad_id][idx_real]
                h_res = hist.get("resultado", "")
                color = _calcular_color(h_res, idx_real, semaforo) if h_res not in (None, "") else "Gris"
                _escribir_celdas_mes(ws, fmt, fila_excel, col, clave_base,
                                     hist.get("numerador", ""), hist.get("denominador", ""), h_res, color)
            else:
                for i in range(3):
                    ws.write(fila_excel, col + i, "", fmt[clave_base])

    # Leyenda de poblacion, una por cada mes mostrado (no una sola para toda la
    # hoja) -- cada mes pudo calcularse con una poblacion distinta (regla de
    # corte hacia adelante), justo debajo de donde terminan las unidades,
    # fusionada en el mismo ancho de columnas NUM..% de ese mes.
    poblacion_por_mes = poblacion_por_mes or {}
    for pos, idx_real in enumerate(checkpoints):
        poblacion_mes = poblacion_por_mes.get(idx_real)
        if not poblacion_mes:
            continue
        sc = pos * 3 + 1
        ws.merge_range(ultima_fila + 1, sc, ultima_fila + 1, sc + 2, f"Población: {poblacion_mes}", fmt['poblacion_leyenda'])

    # Solo indicadores que piden mensual Y mensual acumulado (MT 03-05): bloque aparte debajo,
    # dejando una fila libre tras la leyenda de poblacion.
    if acumulado_por_mes:
        _escribir_bloque_acumulado(ws, fmt, ultima_fila + 3, ultima_col, checkpoints, semaforo,
                                   acumulado_por_mes, list(diccionarioPrevio.keys()), lista_tecnica, idx_mes_activo)
