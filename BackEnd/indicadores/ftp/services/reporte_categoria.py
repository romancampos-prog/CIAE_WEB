"""
Pipeline paralelo para generar todos los indicadores de una categoría en un solo Excel.
Usado en: ftp/controllers/reportes_controller.py

Flujo optimizado:
  FASE 1 — Paralela  : preparar_datos_indicador() por cada indicador (FTP + cálculos con caché)
  FASE 2 — Secuencial: escribir_hoja_indicador() acumula hojas en un único xlsxwriter.Workbook
"""
import xlsxwriter
from ftp.services.mapeo_ftp import cargar_ficha_ftp
from ftp.services.ftp_extraer_unificado import ExtraerYCalcularIndicadorUnificado
from ftp.services.semaforizado import Semaforizado
from ftp.services.generar_excel import (
    _leer_historicos, _calcular_color, _estilo_valor,
    _es_descendente, _texto_medio,
)
from shared.semaforo_service import numero_de_umbral
from shared.reglas_periodicidad import indices_de_meses, descripcion_periodicidad
from ftp.config import UNIDADES_PREVIOS, UNIDADES_FINALES, NOMBREUNIDADESARCHIVO
from ftp.services.datos_json_service import (
    guardar_datos_en_json, guardar_semana_en_json, borrar_semana_del_mes,
)

MESES_LISTA = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]


def _metadata_de(ficha) -> dict:
    return {
        "titulo":       ficha.informacion.titulo,
        "desNum":       ficha.informacion.descNum,
        "desDen":       ficha.informacion.descDen,
        "arch":         ficha.nombreArchivoFinal,
        "semaforo":     ficha.semaforo,
        "decimales":    None,
        "periodicidad": ficha.periodicidad,
    }


def preparar_datos_indicador(indicador: str, ano: str, mes: str, semana) -> dict:
    try:
        metadata = _metadata_de(cargar_ficha_ftp(indicador))

        diccionarioPrevio, errores = ExtraerYCalcularIndicadorUnificado(indicador, ano, mes, semana)
        diccionarioPrevio = Semaforizado(diccionarioPrevio, metadata["semaforo"], mes)

        es_semana = bool(semana and str(semana).strip() not in ("", "None", "none"))
        if not es_semana:
            guardar_datos_en_json(indicador, ano, mes, diccionarioPrevio)
            borrar_semana_del_mes(indicador, ano, mes)
        else:
            guardar_semana_en_json(indicador, ano, mes, semana, diccionarioPrevio)

        return {
            "status":            "success",
            "diccionarioPrevio": diccionarioPrevio,
            "errores":           errores,
            "metadata":          metadata,
        }
    except Exception as exc:
        return {"status": "error", "mensaje": str(exc)}


def escribir_hoja_indicador(wb: xlsxwriter.Workbook, fmt: dict,
                             indicador: str, diccionarioPrevio: dict,
                             metadata: dict, ano: str, mes: str,
                             semana, es_semana: bool, historicos: dict | None = None):
    titulo       = metadata["titulo"] or ""
    desNum       = metadata["desNum"] or ""
    desDen       = metadata["desDen"] or ""
    arch         = metadata["arch"]   or indicador
    semaforo     = metadata["semaforo"]
    periodicidad = metadata.get("periodicidad")

    idx_mes_activo = int(mes) - 1

    if historicos is None:
        historicos, _ = _leer_historicos(
            indicador, ano, idx_mes_activo, list(diccionarioPrevio.keys())
        )

    checkpoints = indices_de_meses(periodicidad)
    ultima_col = len(checkpoints) * 3

    nombre_mes_act = MESES_LISTA[idx_mes_activo]
    limites       = semaforo.get(nombre_mes_act, semaforo)
    v_esp         = numero_de_umbral(limites.get("Esperado", 0))
    tiene_alto    = _es_descendente(limites)
    clave_critica = "Alto" if "Alto" in limites else "Bajo"
    v_critico     = numero_de_umbral(limites.get(clave_critica, 0))

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
    ws.set_column(0, 0, 50)
    ws.set_column(1, ultima_col, 14)
    ws.set_default_row(20)

    ws.merge_range(0, 0, 0, ultima_col, "NOTA: SOLO SE HACE SUMATORIA DE LAS UNIDADES COMPLETAS", fmt['nota_completas'])
    ws.merge_range(1, 0, 1, ultima_col, titulo.upper(), fmt['titulo_izq'])
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
    ws.merge_range(r, 0, r + 4, 0, "UNIDAD MEDICA", fmt['columna_unidad_header'])

    for pos, idx_real in enumerate(checkpoints):
        nombre_m = MESES_LISTA[idx_real]
        sc = pos * 3 + 1
        ws.merge_range(r, sc, r, sc + 2, nombre_m.upper(), fmt['subtitulo'])

        if idx_real == idx_mes_activo:
            if tiene_alto:
                ws.merge_range(r + 1, sc, r + 1, sc + 2, f"ESPERADO: <= {v_esp}", fmt['Esperado_Leyenda'])
                ws.merge_range(r + 2, sc, r + 2, sc + 2, _texto_medio(v_esp, v_critico, True), fmt['Medio_Leyenda'])
                ws.merge_range(r + 3, sc, r + 3, sc + 2, f"{clave_critica.upper()}: >= {v_critico}", fmt['Bajo_Leyenda'])
            else:
                ws.merge_range(r + 1, sc, r + 1, sc + 2, f"ESPERADO: >= {v_esp}", fmt['Esperado_Leyenda'])
                ws.merge_range(r + 2, sc, r + 2, sc + 2, _texto_medio(v_esp, v_critico, False), fmt['Medio_Leyenda'])
                ws.merge_range(r + 3, sc, r + 3, sc + 2, f"BAJO: <= {v_critico}", fmt['Bajo_Leyenda'])
        else:
            lim_h         = semaforo.get(MESES_LISTA[idx_real], semaforo)
            v_h           = numero_de_umbral(lim_h.get("Esperado", 0))
            alt_h         = _es_descendente(lim_h)
            clave_crit_h  = "Alto" if "Alto" in lim_h else "Bajo"
            crit_h        = numero_de_umbral(lim_h.get(clave_crit_h, 0))
            if alt_h:
                ws.merge_range(r + 1, sc, r + 1, sc + 2, f"ESPERADO: <= {v_h}", fmt['Esperado_Leyenda'])
                ws.merge_range(r + 2, sc, r + 2, sc + 2, _texto_medio(v_h, crit_h, True), fmt['Medio_Leyenda'])
                ws.merge_range(r + 3, sc, r + 3, sc + 2, f"{clave_crit_h.upper()}: >= {crit_h}", fmt['Bajo_Leyenda'])
            else:
                ws.merge_range(r + 1, sc, r + 1, sc + 2, f"ESPERADO: >= {v_h}", fmt['Esperado_Leyenda'])
                ws.merge_range(r + 2, sc, r + 2, sc + 2, _texto_medio(v_h, crit_h, False), fmt['Medio_Leyenda'])
                ws.merge_range(r + 3, sc, r + 3, sc + 2, f"BAJO: <= {crit_h}", fmt['Bajo_Leyenda'])

        ws.write(r + 4, sc,     "NUM", fmt['header_sub'])
        ws.write(r + 4, sc + 1, "DEN", fmt['header_sub'])
        ws.write(r + 4, sc + 2, "%",   fmt['header_sub'])

    ultima_fila   = r + 5 + len(diccionarioPrevio) - 1
    lista_tecnica = UNIDADES_PREVIOS if es_semana else UNIDADES_FINALES
    ws.autofilter(r + 4, 0, ultima_fila, 0)

    for idx_fila, unidad_id in enumerate(diccionarioPrevio.keys()):
        fila_excel = idx_fila + r + 5
        es_total   = (unidad_id == "TOTAL_OOAD")

        fmt_nombre = fmt['total_gris_80'] if es_total else fmt['columna_unidad_dato']
        clave_base = 'total_gris_80' if es_total else (
            'fila_par' if idx_fila % 2 == 0 else 'dato_normal'
        )
        fmt_base   = fmt[clave_base]

        if es_total:
            nombre_oficial = "TOTAL"
        else:
            try:
                pos            = lista_tecnica.index(unidad_id)
                nombre_oficial = NOMBREUNIDADESARCHIVO[pos]
            except Exception:
                nombre_oficial = unidad_id

        ws.write(fila_excel, 0, nombre_oficial, fmt_nombre)

        for pos, idx_real in enumerate(checkpoints):
            col = pos * 3 + 1

            if idx_real == idx_mes_activo:
                reg      = diccionarioPrevio[unidad_id]
                num      = reg.get("numerador")
                den      = reg.get("denominador")
                res      = reg.get("resultado")
                fmt_gris = fmt.get("Gris_Capsula", fmt['dato_normal'])

                if res is None:
                    # Gris = dato incompleto -- se muestra el numerador o denominador que
                    # sí tenga valor (el que sea None se deja vacio), en gris RGB(49,134,155)
                    # bold para marcar que no se contó en el total; solo el resultado se deja
                    # vacio y en gris.
                    ws.write(fila_excel, col,     num if num is not None else "", _estilo_valor(fmt, clave_base, num))
                    ws.write(fila_excel, col + 1, den if den is not None else "", _estilo_valor(fmt, clave_base, den))
                    ws.write(fila_excel, col + 2, "", fmt_gris)
                else:
                    fmt_pct = fmt.get(f"{reg.get('color','Gris')}_Capsula", fmt['dato_normal'])
                    ws.write(fila_excel, col,     num, fmt_base)
                    ws.write(fila_excel, col + 1, den, fmt_base)
                    ws.write(fila_excel, col + 2, res, fmt_pct)
            elif idx_real < idx_mes_activo:
                hist = historicos.get(unidad_id, {}).get(idx_real, {})
                if hist:
                    h_num    = hist.get("numerador", "")
                    h_den    = hist.get("denominador", "")
                    h_res    = hist.get("resultado", "")
                    fmt_gris = fmt.get("Gris_Capsula", fmt['dato_normal'])

                    if h_res == "" or h_res is None:
                        ws.write(fila_excel, col,     h_num if h_num not in (None, "") else "", _estilo_valor(fmt, clave_base, h_num if h_num not in (None, "") else None))
                        ws.write(fila_excel, col + 1, h_den if h_den not in (None, "") else "", _estilo_valor(fmt, clave_base, h_den if h_den not in (None, "") else None))
                        ws.write(fila_excel, col + 2, "", fmt_gris)
                    else:
                        fmt_pct = fmt.get(f"{_calcular_color(h_res, idx_real, semaforo)}_Capsula", fmt['dato_normal'])
                        ws.write(fila_excel, col,     h_num, fmt_base)
                        ws.write(fila_excel, col + 1, h_den, fmt_base)
                        ws.write(fila_excel, col + 2, h_res, fmt_pct)
                else:
                    for i in range(3):
                        ws.write(fila_excel, col + i, "", fmt_base)
            else:
                for i in range(3):
                    ws.write(fila_excel, col + i, "", fmt_base)
