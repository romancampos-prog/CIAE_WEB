"""
Dibujante estandar de la pestaña de un indicador (FTP y Extractor): encabezado, leyendas del
semaforo, una fila por unidad y, si aplica, el bloque de mensual acumulado. Recibe los datos
ya leidos (incluido el historico de meses); no lee la BD.
Usado en: services/excel/hoja_estandar_excel_Services.py
"""
import xlsxwriter

from services.excel.estilos_excel_Services import estilo_valor
from services.excel.leyendas_semaforo_excel_Services import calcular_color, leyendas_semaforo
from shared.MESES import MESES_ESTANDAR as MESES_LISTA
from shared.reglas_periodicidad import descripcion_periodicidad, indices_de_meses
from shared.UNIDADES import NOMBREUNIDADESARCHIVO, UNIDADES_FINALES, UNIDADES_PREVIOS


def _escribir_encabezado_meses(ws, fmt, r, checkpoints, semaforo, etiqueta_mes) -> None:
    """Fila r: nombre de cada columna de mes; r+1..r+3: leyenda del semaforo; r+4: NUM / DEN / %."""
    ws.merge_range(r, 0, r + 4, 0, "UNIDAD MEDICA", fmt['columna_unidad_header'])

    for pos, idx_real in enumerate(checkpoints):
        nombre_m = MESES_LISTA[idx_real]
        sc = pos * 3 + 1
        ws.merge_range(r, sc, r, sc + 2, etiqueta_mes(idx_real), fmt['subtitulo'])

        # cada mes con su propio semaforo (puede variar por mes)
        texto_esp, texto_medio, texto_critico = leyendas_semaforo(semaforo.get(nombre_m, semaforo))
        ws.merge_range(r + 1, sc, r + 1, sc + 2, texto_esp,     fmt['Esperado_Leyenda'])
        ws.merge_range(r + 2, sc, r + 2, sc + 2, texto_medio,   fmt['Medio_Leyenda'])
        ws.merge_range(r + 3, sc, r + 3, sc + 2, texto_critico, fmt['Bajo_Leyenda'])

        ws.write(r + 4, sc,     "NUM", fmt['header_sub'])
        ws.write(r + 4, sc + 1, "DEN", fmt['header_sub'])
        ws.write(r + 4, sc + 2, "%",   fmt['header_sub'])


##--------------------------------------

def _nombre_oficial(unidad_id: str, lista_tecnica: list) -> str:
    if unidad_id == "TOTAL_OOAD":
        return "TOTAL"

    try:
        return NOMBREUNIDADESARCHIVO[lista_tecnica.index(unidad_id)]
    except Exception:
        return unidad_id


##--------------------------------------

def _escribir_celdas_mes(ws, fmt, fila, col, clave_base, num, den, res, color) -> None:
    """NUM / DEN / % de una unidad en un mes. Sin resultado (Gris = dato incompleto) se muestra
    el numerador o denominador que si tenga valor en gris RGB(49,134,155) bold, para marcar que
    no se conto en el total; el % se deja vacio y en gris."""
    num = None if num in (None, "") else num
    den = None if den in (None, "") else den

    if res in (None, ""):
        ws.write(fila, col,     num if num is not None else "", estilo_valor(fmt, clave_base, num))
        ws.write(fila, col + 1, den if den is not None else "", estilo_valor(fmt, clave_base, den))
        ws.write(fila, col + 2, "", fmt.get("Gris_Capsula", fmt['dato_normal']))
    else:
        ws.write(fila, col,     num, fmt[clave_base])
        ws.write(fila, col + 1, den, fmt[clave_base])
        ws.write(fila, col + 2, res, fmt.get(f"{color}_Capsula", fmt['dato_normal']))


##--------------------------------------

def _clave_base_fila(idx_fila: int, es_total: bool) -> str:
    return 'total_gris_80' if es_total else ('fila_par' if idx_fila % 2 == 0 else 'dato_normal')


##--------------------------------------

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


##--------------------------------------

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
                color = calcular_color(h_res, idx_real, semaforo) if h_res not in (None, "") else "Gris"
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
