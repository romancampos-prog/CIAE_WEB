"""
Módulo  : generar_excel.py
Carpeta : reportes/services/
Qué hace: Genera el archivo Excel de un indicador FTP con estilos, históricos y semáforo.
Usado en: reporte_final.py, reporte_categoria.py
"""
import io
import xlsxwriter
from configs.unidades import UNIDADES_PREVIOS, UNIDADES_FINALES, NOMBREUNIDADESARCHIVO
from reportes.services.datos_json_service import leer_historicos_para_excel


def _calcular_color(valor, idx_mes, indicadorSemaforo):
    MESES_LISTA = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                   "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    if valor == "" or valor is None:
        return 'Gris'
    try:
        val        = float(valor)
        limites    = indicadorSemaforo.get(MESES_LISTA[idx_mes], indicadorSemaforo)
        v_esp      = limites.get("Esperado", 0)
        tiene_alto = "Alto" in limites
        v_critico  = limites.get("Alto") if tiene_alto else limites.get("Bajo", 0)

        if tiene_alto:
            if val <= v_esp:      return 'Verde'
            elif val < v_critico: return 'Amarillo'
            else:                 return 'Rojo'
        else:
            if val >= v_esp:      return 'Verde'
            elif val > v_critico: return 'Amarillo'
            else:                 return 'Rojo'
    except Exception:
        return 'Gris'


def Excel_final(diccionarioPrevio, indicadorTitulo, indicadordesNum, indicadordesDen,
                indicadoresArch, ano, mes, semana, indicadorSemaforo,
                es_semana=False, historicos={}, leyendas={}, indicador=''):

    output = io.BytesIO()
    try:
        workbook  = xlsxwriter.Workbook(output)
        workbook.set_properties({'author': 'Web CIAE'})
        worksheet = workbook.add_worksheet(indicador or "Base SIAIS")
        fmt       = obtener_estilos_excel(workbook)

        MESES_LISTA    = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
        idx_mes_activo = int(mes) - 1
        nombre_mes_act = MESES_LISTA[idx_mes_activo]

        n_meses    = 12
        ultima_col = 36

        limites    = indicadorSemaforo.get(nombre_mes_act, indicadorSemaforo)
        v_esp      = limites.get("Esperado", 0)
        tiene_alto = "Alto" in limites
        v_critico  = limites.get("Alto") if tiene_alto else limites.get("Bajo", 0)

        worksheet.set_column(0, 0, 50)
        worksheet.set_column(1, ultima_col, 14)
        worksheet.set_default_row(20)

        worksheet.merge_range(1, 0, 1, ultima_col, indicadorTitulo.upper(), fmt['titulo_izq'])
        worksheet.write(3, 0, "  NUMERADOR",   fmt['etiqueta_bold'])
        worksheet.merge_range(3, 1, 3, ultima_col, f"  {indicadordesNum.upper()}", fmt['descripcion'])
        worksheet.write(4, 0, "  DENOMINADOR", fmt['etiqueta_bold'])
        worksheet.merge_range(4, 1, 4, ultima_col, f"  {indicadordesDen.upper()}", fmt['descripcion'])
        worksheet.merge_range(5, 0, 9, 0, "UNIDAD MEDICA", fmt['columna_unidad_header'])

        for index, nombre_m in enumerate(MESES_LISTA[:n_meses]):
            sc = index * 3 + 1
            worksheet.merge_range(5, sc, 5, sc + 2, nombre_m.upper(), fmt['subtitulo'])

            if index == idx_mes_activo:
                if tiene_alto:
                    worksheet.merge_range(6, sc, 6, sc + 2, f"ESPERADO: <= {v_esp}",             fmt['Verde_Leyenda'])
                    worksheet.merge_range(7, sc, 7, sc + 2, f"MEDIO: > {v_esp} y < {v_critico}", fmt['Dorado_Leyenda'])
                    worksheet.merge_range(8, sc, 8, sc + 2, f"ALTO: >= {v_critico}",             fmt['Rojo_Leyenda'])
                else:
                    worksheet.merge_range(6, sc, 6, sc + 2, f"ESPERADO: >= {v_esp}",             fmt['Verde_Leyenda'])
                    worksheet.merge_range(7, sc, 7, sc + 2, f"MEDIO: < {v_esp} y > {v_critico}", fmt['Dorado_Leyenda'])
                    worksheet.merge_range(8, sc, 8, sc + 2, f"BAJO: <= {v_critico}",             fmt['Rojo_Leyenda'])
            else:
                # Calcular umbral desde el semáforo para cada mes histórico
                lim_h  = indicadorSemaforo.get(MESES_LISTA[index], indicadorSemaforo)
                v_h    = lim_h.get("Esperado", 0)
                alt_h  = "Alto" in lim_h
                crit_h = lim_h.get("Alto") if alt_h else lim_h.get("Bajo", 0)
                if alt_h:
                    worksheet.merge_range(6, sc, 6, sc + 2, f"ESPERADO: <= {v_h}",            fmt['Verde_Leyenda'])
                    worksheet.merge_range(7, sc, 7, sc + 2, f"MEDIO: > {v_h} y < {crit_h}",  fmt['Dorado_Leyenda'])
                    worksheet.merge_range(8, sc, 8, sc + 2, f"ALTO: >= {crit_h}",             fmt['Rojo_Leyenda'])
                else:
                    worksheet.merge_range(6, sc, 6, sc + 2, f"ESPERADO: >= {v_h}",            fmt['Verde_Leyenda'])
                    worksheet.merge_range(7, sc, 7, sc + 2, f"MEDIO: < {v_h} y > {crit_h}",  fmt['Dorado_Leyenda'])
                    worksheet.merge_range(8, sc, 8, sc + 2, f"BAJO: <= {crit_h}",             fmt['Rojo_Leyenda'])

            worksheet.write(9, sc,     "NUM", fmt['header_sub'])
            worksheet.write(9, sc + 1, "DEN", fmt['header_sub'])
            worksheet.write(9, sc + 2, "%",   fmt['header_sub'])

        ultima_fila = 10 + len(diccionarioPrevio) - 1
        worksheet.autofilter(9, 0, ultima_fila, 0)

        lista_tecnica = UNIDADES_PREVIOS if es_semana else UNIDADES_FINALES

        for idx_fila, unidad_id_ftp in enumerate(diccionarioPrevio.keys()):
            fila_excel = idx_fila + 10
            es_total   = (unidad_id_ftp == "TOTAL")

            estilo_celda_nombre = fmt['total_gris_80'] if es_total else fmt['columna_unidad_dato']
            estilo_base         = fmt['total_gris_80'] if es_total else (fmt['fila_par'] if idx_fila % 2 == 0 else fmt['dato_normal'])

            if es_total:
                nombre_oficial = "TOTAL"
            else:
                try:
                    posicion       = lista_tecnica.index(unidad_id_ftp)
                    nombre_oficial = NOMBREUNIDADESARCHIVO[posicion]
                except Exception:
                    nombre_oficial = unidad_id_ftp

            worksheet.write(fila_excel, 0, nombre_oficial, estilo_celda_nombre)

            for idx_mes in range(n_meses):
                col_base = (idx_mes * 3) + 1

                if idx_mes == idx_mes_activo:
                    reg      = diccionarioPrevio[unidad_id_ftp]
                    num      = reg.get("numerador")
                    den      = reg.get("denominador")
                    res      = reg.get("resultado")
                    fmt_gris = fmt.get("Gris_Capsula", fmt['dato_normal'])

                    if res is None:
                        worksheet.write(fila_excel, col_base,     num if num is not None else "", estilo_base)
                        worksheet.write(fila_excel, col_base + 1, den if den is not None else "", estilo_base)
                        worksheet.write(fila_excel, col_base + 2, "", fmt_gris)
                    else:
                        color_tag  = reg.get('color', 'Gris')
                        estilo_pct = fmt.get(f"{color_tag}_Capsula", fmt['dato_normal'])
                        worksheet.write(fila_excel, col_base,     num, estilo_base)
                        worksheet.write(fila_excel, col_base + 1, den, estilo_base)
                        worksheet.write(fila_excel, col_base + 2, res, estilo_pct)
                elif idx_mes < idx_mes_activo:
                    hist_mes = historicos.get(unidad_id_ftp, {}).get(idx_mes, {})
                    if hist_mes:
                        h_num    = hist_mes.get("numerador", "")
                        h_den    = hist_mes.get("denominador", "")
                        h_res    = hist_mes.get("resultado", "")
                        fmt_gris = fmt.get("Gris_Capsula", fmt['dato_normal'])

                        if h_res == "" or h_res is None:
                            worksheet.write(fila_excel, col_base,     h_num if h_num != "" else "", estilo_base)
                            worksheet.write(fila_excel, col_base + 1, h_den if h_den != "" else "", estilo_base)
                            worksheet.write(fila_excel, col_base + 2, "", fmt_gris)
                        else:
                            color_tag  = _calcular_color(h_res, idx_mes, indicadorSemaforo)
                            estilo_pct = fmt.get(f"{color_tag}_Capsula", fmt['dato_normal'])
                            worksheet.write(fila_excel, col_base,     h_num, estilo_base)
                            worksheet.write(fila_excel, col_base + 1, h_den, estilo_base)
                            worksheet.write(fila_excel, col_base + 2, h_res, estilo_pct)
                    else:
                        for i in range(3):
                            worksheet.write(fila_excel, col_base + i, "", estilo_base)
                else:
                    # Meses futuros — siempre vacíos
                    for i in range(3):
                        worksheet.write(fila_excel, col_base + i, "", estilo_base)

        workbook.close()
        output.seek(0)
        return output

    except Exception as e:
        print(f"Error en Excel_final: {e}")
        return None


def ExcelFinalConPlantilla(diccionarioPrevio, indicadorTitulo, indicadordesNum, indicadordesDen,
                           indicadoresArch, ano, mes, semana, indicadorSemaforo,
                           indicador, es_semana=False):

    idx_mes_activo       = int(mes) - 1
    historicos, leyendas = _leer_historicos(indicador, ano, idx_mes_activo, list(diccionarioPrevio.keys()))

    archivo = Excel_final(
        diccionarioPrevio, indicadorTitulo, indicadordesNum, indicadordesDen,
        indicadoresArch, ano, mes, semana, indicadorSemaforo,
        es_semana=es_semana, historicos=historicos, leyendas=leyendas,
        indicador=indicador
    )

    return archivo


def _leer_historicos(indicador, ano, idx_mes_activo, claves_diccionario):
    """Lee históricos desde el JSON del indicador. Delega a datos_json_service."""
    return leer_historicos_para_excel(indicador, ano, idx_mes_activo, claves_diccionario)


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
        'etiqueta_bold':         workbook.add_format({**base, 'bold': True, 'bg_color': C_GRIS_FONDOS, 'align': 'left'}),
        'descripcion':           workbook.add_format({**base, 'text_wrap': True, 'font_color': '#444444', 'align': 'left'}),
        'columna_unidad_header': workbook.add_format({**base, 'bold': True, 'bg_color': C_GRIS_FONDOS}),
        'columna_unidad_dato':   workbook.add_format({**base, 'bg_color': C_GRIS_FONDOS}),
        'subtitulo':             workbook.add_format({**base, 'bold': True, 'bg_color': C_GRIS_FONDOS, 'font_color': '#444444'}),
        'header_sub':            workbook.add_format({**base, 'bold': True, 'bg_color': C_GRIS_FONDOS, 'font_size': 9}),
        'Verde_Leyenda':         workbook.add_format({**base, 'bg_color': C_GRIS_FONDOS, 'font_color': C_VERDE,  'bold': True}),
        'Dorado_Leyenda':        workbook.add_format({**base, 'bg_color': C_GRIS_FONDOS, 'font_color': C_DORADO, 'bold': True}),
        'Rojo_Leyenda':          workbook.add_format({**base, 'bg_color': C_GRIS_FONDOS, 'font_color': C_ROJO,   'bold': True}),
        'dato_normal':           workbook.add_format({**base, 'num_format': '#,##0'}),
        'fila_par':              workbook.add_format({**base, 'bg_color': '#F9F9F9', 'num_format': '#,##0'}),
        'total_gris_80':         workbook.add_format({**base, 'bold': True, 'bg_color': C_GRIS_TOTAL, 'font_color': 'white', 'num_format': '#,##0'}),
        'Verde_Capsula':         workbook.add_format({**base, 'bg_color': C_VERDE,   'font_color': 'white', 'bold': True, 'num_format': '0.00'}),
        'Amarillo_Capsula':      workbook.add_format({**base, 'bg_color': C_DORADO,  'font_color': 'white', 'bold': True, 'num_format': '0.00'}),
        'Rojo_Capsula':          workbook.add_format({**base, 'bg_color': C_ROJO,    'font_color': 'white', 'bold': True, 'num_format': '0.00'}),
        'Gris_Capsula':          workbook.add_format({**base, 'bg_color': '#CCCCCC', 'font_color': 'black', 'bold': True, 'num_format': '0.00'}),
    }
