"""
Descarga archivos Excel del FTP y extrae datos por indicador y unidad médica.
Usado en: ftp_indicadores/services/ftp_extraer_cache.py, reporte_final.py, reporte_categoria.py
"""
import io
import json
import pandas as pd
from ftp_indicadores.config import (
    UNIDADES_FINALES, UNIDADES_PREVIOS, CLAVE_UNIDADES, NOMBREUNIDADESARCHIVO
)
from ftp_indicadores.config import RUTA_POBLACION
from ftp_indicadores.services.ftp_conectar import conectar_ftp, desconectar_ftp


def ExtraerInformacionPrevia(informacionReportes, ano, mes, semana, meses_mapeo=None):
    if not isinstance(informacionReportes, dict):
        return {}, {}

    diccionarioPrevio = {nombre: {} for nombre in NOMBREUNIDADESARCHIVO}

    logErrores = {
        "RUTA_INVALIDA":           {"nombreError": "Ruta de acceso incorrecta",      "descripcionError": "La carpeta en el FTP no existe o está mal nombrada.", "unidades": {}},
        "ARCHIVO_NO_ENCONTRADO":   {"nombreError": "Archivo no encontrado",           "descripcionError": "El archivo no se encontró en la ubicación esperada.", "unidades": {}},
        "ARCHIVO_DUPLICADO":       {"nombreError": "Archivo duplicado",               "descripcionError": "Se encontró más de un archivo con el mismo prefijo. Se usó el primero encontrado.", "unidades": {}},
        "HOJA_NO_ENCONTRADA":      {"nombreError": "Pestaña faltante",                "descripcionError": "El archivo existe pero no contiene la hoja especificada.", "unidades": {}},
        "ETIQUETA_NO_ENCONTRADA":  {"nombreError": "Etiqueta no encontrada en Excel", "descripcionError": "El texto que se buscaba como etiqueta de fila no existe en esa columna de la hoja indicada.", "unidades": {}},
        "ARCHIVO_VACIO":           {"nombreError": "Archivo sin datos numéricos",     "descripcionError": "El archivo existe y la hoja fue leída, pero las celdas de datos están vacías o no son numéricas.", "unidades": {}},
        "VALOR_NULO":              {"nombreError": "Celda sin dato",                  "descripcionError": "El archivo tiene datos pero alguna celda específica está vacía o no es numérica. Se usó 0 en su lugar.", "unidades": {}},
        "DESCARGA_FALLIDA":        {"nombreError": "Error al descargar archivo",      "descripcionError": "El archivo existe en el FTP pero no pudo descargarse (error de red, permisos o archivo corrupto).", "unidades": {}},
        "PB_JSON_ERROR":           {"nombreError": "Error en población JSON",         "descripcionError": "La unidad o columna solicitada no existe en POBLACION.json.", "unidades": {}},
    }

    ftp = conectar_ftp()
    if not ftp:
        return diccionarioPrevio, {"CONEXION": {"nombreError": "Error FTP", "descripcionError": "Fallo de conexión", "unidades": {}}}

    try:
        for repo, infoRepo in informacionReportes.items():
            if infoRepo.get('modo') == 'JSON_POBLACION':
                ExtraerPBDesdeJSON(repo, infoRepo, diccionarioPrevio, logErrores)
                continue

            prefRepor = repo[:2]
            if prefRepor in ["CP", "CI", "IA"]:
                procesar_extraccion_ftp(ftp, repo, ano, mes, semana, infoRepo, diccionarioPrevio, logErrores, "Salud Pública", meses_mapeo)
            elif prefRepor == "PB":
                ExtraerPB(ftp, repo, ano, infoRepo, diccionarioPrevio, logErrores, meses_mapeo)
            elif prefRepor == "IN":
                procesar_extraccion_ftp(ftp, repo, ano, mes, semana, infoRepo, diccionarioPrevio, logErrores, "Indicadores", meses_mapeo)
            elif prefRepor == "MT":
                procesar_extraccion_ftp(ftp, repo, ano, mes, semana, infoRepo, diccionarioPrevio, logErrores, "Salud Materna", meses_mapeo)
            elif prefRepor == "PU":
                procesar_extraccion_ftp(ftp, repo, ano, mes, semana, infoRepo, diccionarioPrevio, logErrores, "Productividad", meses_mapeo)

        logFinal = {k: v for k, v in logErrores.items() if v["unidades"]}
        return diccionarioPrevio, logFinal
    finally:
        desconectar_ftp(ftp)


def registrar_error(logErrores, id_error, unidad, repo, ruta_afectada):
    if unidad not in logErrores[id_error]["unidades"]:
        logErrores[id_error]["unidades"][unidad] = []

    bloque = next((x for x in logErrores[id_error]["unidades"][unidad] if x["ruta"] == ruta_afectada), None)

    if bloque:
        if f"[{repo}]" not in bloque["reportes"]:
            bloque["reportes"].append(f"[{repo}]")
    else:
        logErrores[id_error]["unidades"][unidad].append({
            "reportes": [f"[{repo}]"],
            "ruta": ruta_afectada
        })


def _navegar_ruta(ftp, carpeta_remota: str):
    """Navega la ruta segmento por segmento. Retorna (True, None) o (False, segmento_que_fallo)."""
    ftp.cwd('/')
    for segmento in carpeta_remota.split("/"):
        if not segmento:
            continue
        try:
            ftp.cwd(segmento)
        except Exception:
            return False, segmento
    return True, None


def procesar_extraccion_ftp(ftp, repo, ano, mes, semana, infoReporte, diccionarioGlobal, logErrores, subcarpeta_base, meses_mapeo=None):
    unidades_ruta   = UNIDADES_PREVIOS if semana is not None else UNIDADES_FINALES
    nombres_destino = list(diccionarioGlobal.keys())

    for i, unidad_ruta in enumerate(unidades_ruta):
        nombre_final = nombres_destino[i]
        s_val = str(semana) if semana else ""

        if semana is None:
            carpeta_remota = f"01. DATAMARTEM/ArchsDataMart_{ano}/{ano}{mes}/{unidad_ruta}/1.SIAIS_Reportes/{subcarpeta_base}"
        else:
            carpeta_remota = f"01. DATAMARTEM/ArchsData_Previos_{ano}/{ano}{mes}/{unidad_ruta}/1.SIAIS_Reportes/Semana_{s_val}/{subcarpeta_base}_S{s_val}"

        try:
            ok, seg_fallido = _navegar_ruta(ftp, carpeta_remota)
            if not ok:
                ruta_log = f"{carpeta_remota}  ✗ fallo en: '{seg_fallido}'"
                registrar_error(logErrores, "RUTA_INVALIDA", nombre_final, repo, ruta_log)
                diccionarioGlobal[nombre_final][repo] = None
                continue

            archivos = ftp.nlst()
            repo_busqueda = repo.split("_")[0]

            archivos_filtrados = [
                f for f in archivos
                if f.upper().strip().startswith(repo_busqueda.upper())
                and f.upper().endswith((".XLS", ".XLSX"))
            ]

            if len(archivos_filtrados) > 1:
                registrar_error(logErrores, "ARCHIVO_DUPLICADO", nombre_final, repo, carpeta_remota)

            archivo_encontrado = archivos_filtrados[0] if archivos_filtrados else None

            if archivo_encontrado:
                nombre_archivo = archivo_encontrado.split("/")[-1]
                buf = io.BytesIO()
                ftp.retrbinary(f"RETR {nombre_archivo}", buf.write, blocksize=65536)
                buf.seek(0)
                datos, id_falla, detalle_falla = ExtraerDatosDelExcel(buf, infoReporte, mes, meses_mapeo)
                diccionarioGlobal[nombre_final][repo] = datos
                if id_falla:
                    ruta_log = detalle_falla if detalle_falla else carpeta_remota
                    registrar_error(logErrores, id_falla, nombre_final, repo, ruta_log)
            else:
                diccionarioGlobal[nombre_final][repo] = None
                registrar_error(logErrores, "ARCHIVO_NO_ENCONTRADO", nombre_final, repo, carpeta_remota)
        except Exception as exc:
            registrar_error(logErrores, "DESCARGA_FALLIDA", nombre_final, repo, f"{carpeta_remota} · {exc}")
            diccionarioGlobal[nombre_final][repo] = None


def ExtraerPBDesdeJSON(repo, infoReporte, diccionarioGlobal, logErrores=None):
    try:
        with open(RUTA_POBLACION, encoding='utf-8') as f:
            poblacion = json.load(f)
    except FileNotFoundError:
        for unidad in diccionarioGlobal:
            diccionarioGlobal[unidad][repo] = None
        return

    columnas     = infoReporte.get('columnas', [])
    grupo        = infoReporte.get('grupo', 'Todos')
    unidades_json = [k for k in poblacion if k != "TOTAL OOAD"]
    unidades_dict = list(diccionarioGlobal.keys())

    for i, unidad_dict in enumerate(unidades_dict):
        if i >= len(unidades_json):
            diccionarioGlobal[unidad_dict][repo] = None
            continue

        clave_json   = unidades_json[i]
        datos_unidad = poblacion[clave_json]

        try:
            valores = []
            if isinstance(grupo, list):
                for g, col in zip(grupo, columnas):
                    if g not in datos_unidad:
                        raise KeyError(f"Grupo '{g}' no existe para '{clave_json}'")
                    if col not in datos_unidad[g]:
                        raise KeyError(f"Columna '{col}' no existe en grupo '{g}' para '{clave_json}'")
                    valores.append(float(datos_unidad[g][col]))
            else:
                if grupo not in datos_unidad:
                    raise KeyError(f"Grupo '{grupo}' no existe para '{clave_json}'")
                grupo_data = datos_unidad[grupo]
                for col in columnas:
                    if col not in grupo_data:
                        raise KeyError(f"Rango de edad '{col}' no existe en grupo '{grupo}' para '{clave_json}'")
                    valores.append(float(grupo_data[col]))

            diccionarioGlobal[unidad_dict][repo] = valores if valores else None

        except Exception as e:
            if logErrores is not None:
                registrar_error(logErrores, "PB_JSON_ERROR", unidad_dict, repo, str(e))
            diccionarioGlobal[unidad_dict][repo] = None


def ExtraerPB(ftp, repo, ano, infoReporte, diccionarioGlobal, logErrores, meses_mapeo=None):
    carpeta_pb      = f"01. DATAMARTEM/ArchsDataMart_{ano}/Piramides para {ano} por unidades"
    nombres_destino = list(diccionarioGlobal.keys())

    for i, pb_clave in enumerate(CLAVE_UNIDADES):
        prefijo_busqueda = f"{repo}U{pb_clave}".upper()
        nombre_final     = nombres_destino[i]

        try:
            ok, seg_fallido = _navegar_ruta(ftp, carpeta_pb)
            if not ok:
                ruta_log = f"{carpeta_pb}  ✗ fallo en: '{seg_fallido}'"
                registrar_error(logErrores, "RUTA_INVALIDA", nombre_final, repo, ruta_log)
                continue

            archivos = ftp.nlst()
            archivo_encontrado = next(
                (f for f in archivos
                 if f.upper().startswith(prefijo_busqueda) and f.upper().endswith((".XLS", ".XLSX"))),
                None
            )

            if archivo_encontrado:
                buf = io.BytesIO()
                ftp.retrbinary(f"RETR {archivo_encontrado}", buf.write, blocksize=65536)
                buf.seek(0)
                datos_pb, id_falla, detalle_falla = ExtraerDatosDelExcel(buf, infoReporte, None, meses_mapeo)
                diccionarioGlobal[nombre_final][repo] = datos_pb
                if id_falla:
                    ruta_log = detalle_falla if detalle_falla else carpeta_pb
                    registrar_error(logErrores, id_falla, nombre_final, repo, ruta_log)
            else:
                diccionarioGlobal[nombre_final][repo] = None
                registrar_error(logErrores, "ARCHIVO_NO_ENCONTRADO", nombre_final, repo, carpeta_pb)
        except Exception:
            diccionarioGlobal[nombre_final][repo] = None


def ExtraerDatosDelExcel(ruta, infoReporte, mes=None, meses_mapeo=None):
    hoja = infoReporte.get('hoja', '?')
    try:
        df = pd.read_excel(ruta, sheet_name=hoja, header=None)
    except ValueError:
        return None, "HOJA_NO_ENCONTRADA", f"Hoja '{hoja}' no encontrada en el archivo"
    except Exception as exc:
        return None, "ARCHIVO_VACIO", f"No se pudo leer el archivo: {exc}"

    modo = infoReporte.get('modo')

    if modo == "INTERSECCION":
        col_etiqueta    = infoReporte['columna_etiqueta']
        idx_etiqueta    = letra_a_numero(col_etiqueta)
        texto_buscar    = infoReporte['texto_buscar']
        letras_columnas = infoReporte['columna_dato']

        serie = df.iloc[:, idx_etiqueta].astype(str).str.replace(r'[\n\r]+', ' ', regex=True)
        filtro_fila = df[serie.str.contains(texto_buscar, na=False, case=False, regex=False)]

        if filtro_fila.empty:
            return None, "ETIQUETA_NO_ENCONTRADA", (
                f"'{texto_buscar}' no encontrado en col {col_etiqueta} · hoja '{hoja}'"
            )

        fila_encontrada = filtro_fila.iloc[0]
        lista_valores = []
        for letra in letras_columnas:
            if letra == "MESES_CIP01":
                if meses_mapeo and mes is not None:
                    letra_real = meses_mapeo.get(str(int(mes)))
                    if not letra_real:
                        return None, "VALOR_NULO", f"Mes {mes} sin columna definida en MESES_CIP01 · hoja '{hoja}'"
                    col_idx = letra_a_numero(letra_real)
                else:
                    lista_valores.append(None)
                    continue
            else:
                col_idx = letra_a_numero(letra)

            valor = fila_encontrada.iloc[col_idx]
            try:
                if pd.api.types.is_number(valor) and not pd.isna(valor):
                    lista_valores.append(float(valor))
                else:
                    valor_limpio = str(valor).replace(',', '').strip()
                    lista_valores.append(float(valor_limpio) if valor_limpio else 0.0)
            except Exception:
                lista_valores.append(None)

        if all(v is None for v in lista_valores):
            cols_str = ", ".join(letras_columnas)
            return None, "ARCHIVO_VACIO", (
                f"Fila con '{texto_buscar}' encontrada pero celdas vacías en cols {cols_str} · hoja '{hoja}'"
            )
        if any(v is None for v in lista_valores):
            return lista_valores, "VALOR_NULO", None
        return lista_valores, None, None

    if modo == "FINAL":
        filas_encabezado = infoReporte.get('encabezado', 0)
        letras_columnas  = infoReporte.get('columna_etiqueta', [])

        indices_cols = [letra_a_numero(l) for l in letras_columnas]
        df_bloque    = df.iloc[filas_encabezado:, indices_cols]

        resultados_finales = []
        for i in range(df_bloque.shape[1]):
            columna      = df_bloque.iloc[:, i]
            solo_numeros = pd.to_numeric(columna, errors='coerce').dropna()
            resultados_finales.append(float(solo_numeros.iloc[-1]) if not solo_numeros.empty else None)

        if all(v is None for v in resultados_finales):
            cols_str = ", ".join(letras_columnas)
            return None, "ARCHIVO_VACIO", (
                f"No hay valores numéricos en cols {cols_str} desde fila {filas_encabezado + 1} · hoja '{hoja}'"
            )
        if any(v is None for v in resultados_finales):
            return resultados_finales, "VALOR_NULO", None
        return resultados_finales, None, None

    if modo == "INTERSECCION_FILA":
        letras_columnas = infoReporte.get('columna_etiqueta', [])
        filas_excel     = infoReporte.get('fila', [])

        lista_valores = []
        filas_fuera = []
        for f_excel in filas_excel:
            idx_fila = f_excel - 1
            for letra in letras_columnas:
                idx_col = letra_a_numero(letra)
                try:
                    valor = df.iloc[idx_fila, idx_col]
                    if pd.api.types.is_number(valor) and not pd.isna(valor):
                        lista_valores.append(float(valor))
                    else:
                        lista_valores.append(0.0)
                except IndexError:
                    lista_valores.append(None)
                    filas_fuera.append(f_excel)

        if not lista_valores or all(v is None for v in lista_valores):
            detalle = f"Filas {filas_excel} no encontradas · hoja '{hoja}'" if filas_fuera else f"Filas {filas_excel} vacías · hoja '{hoja}'"
            return None, "ARCHIVO_VACIO", detalle
        if any(v is None for v in lista_valores):
            return lista_valores, "VALOR_NULO", None
        return lista_valores, None, None

    return None, "ARCHIVO_VACIO", f"Modo de extracción desconocido: '{modo}'"


def letra_a_numero(letra):
    numero = 0
    for c in letra.upper():
        numero = numero * 26 + (ord(c) - ord('A') + 1)
    return numero - 1
