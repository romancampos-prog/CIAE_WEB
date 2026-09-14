"""
Motor generico para indicadores con fuente "extractor" / modoExtraccion
"FILTRO_CONTEO_ACUMULADO" (ver indicadores/mapeo/README.md).

Un Excel crudo (fila por paciente/evento) se sube cada mes; se filtra y cuenta
por unidad, se guarda como el numerador de ese mes, y cuando ya hay una ventana
completa de meses (segun la periodicidad del indicador) se dispara el corte:
se suma el numerador de la ventana, se trae el denominador y se semaforiza.

Pensado para reciclarse con cualquier indicador futuro que use el mismo
modoExtraccion -- nada aqui esta hardcodeado a EH 03 / DM 04 salvo lo que ya
viene descrito en su propio mapeo.
"""
import io
import json
import xlsxwriter
import pandas as pd
from pathlib import Path

from ftp.config import CLAVE_UNIDADES_F, NOMBREUNIDADESARCHIVO, ruta_poblacion
from ftp.services.ftp_extraer import letra_a_numero
from ftp.services.datos_json_service import leer_mes_guardado
from ftp.services.generar_excel import ExcelFinalConPlantilla, obtener_estilos_excel
from ftp.services.reporte_categoria import escribir_hoja_indicador
from extractor.config import (
    ruta_indicador_json, leer_mapeo_indicador, MESES_ESTANDAR,
    MESES_CORTE_SEMESTRAL, ventana_corte, INDICADORES_EXTRACTOR,
)
from schemas.model.indicador_Model import ReporteIndicador, UnidadDatos
from shared.semaforizado_service import SemaforizarReporte

_CONTEXTO_PERMITIDO = {"round": round, "sum": sum, "abs": abs}


# --------------------------------------------------------------------------- #
# 1) Filtrado / conteo del Excel crudo del mes
# --------------------------------------------------------------------------- #

def _cumple_condicion(valor, filtro_cfg) -> bool:
    """Evalua una celda contra una condicion de filtroColumna (formato simple o con 'tipo')."""
    if isinstance(filtro_cfg, dict) and "tipo" in filtro_cfg:
        tipo = filtro_cfg["tipo"]
        objetivo = filtro_cfg["filtro"]

        if tipo == "LISTA":
            if valor is None:
                return False
            if isinstance(valor, (int, float)):
                return valor in objetivo or str(int(valor)) in [str(o) for o in objetivo]
            return str(valor).strip() in [str(o) for o in objetivo]

        if tipo == "RANGO":
            if valor is None or not isinstance(valor, (int, float)) or pd.isna(valor):
                return False
            minimo, maximo = objetivo
            return minimo <= valor <= maximo

        raise ValueError(f"tipo de filtroColumna desconocido: {tipo!r}")

    # Formato simple (igual que FILTRO_CONTEO de IAAS): match exacto o "^prefijo".
    texto = str(filtro_cfg)
    valor_texto = "" if valor is None else str(valor).strip()
    if texto.startswith("^"):
        return valor_texto.startswith(texto[1:])
    return valor_texto == texto


def _fila_cumple(fila, filtro_columna: dict) -> bool:
    for letra, cfg in filtro_columna.items():
        idx = letra_a_numero(letra)
        if not _cumple_condicion(fila.iloc[idx], cfg):
            return False
    return True


def _validar_mes_anio_archivo(df, anio: int, mes_nombre: str) -> None:
    """
    El SUI-13 trae sus propias columnas "mes"/"anio" (declaradas por quien lo
    exporto, no necesariamente el mes real de cada ingreso -- pero sirven para
    detectar el caso mas comun de error: subir el archivo de un mes mientras
    se declara otro en el formulario). Se compara contra el valor que MAS SE
    REPITE en el archivo (no exige que el 100% de las filas coincidan, porque
    es normal que un archivo traiga algunas filas de un mes vecino).
    """
    if 'mes' not in df.columns or 'anio' not in df.columns:
        return  # el archivo no trae estas columnas -- no se puede validar, se deja pasar

    mes_num_declarado = MESES_ESTANDAR.index(mes_nombre) + 1
    combinaciones = df[['mes', 'anio']].dropna()
    if combinaciones.empty:
        return

    mes_mas_comun, anio_mas_comun = combinaciones.mode().iloc[0]
    if int(mes_mas_comun) != mes_num_declarado or int(anio_mas_comun) != int(anio):
        raise ValueError(
            f"El archivo parece ser de {int(mes_mas_comun):02d}/{int(anio_mas_comun)} "
            f"(según sus propias columnas mes/anio), pero declaraste {mes_nombre} {anio}. "
            f"Revisa que sea el archivo correcto antes de subirlo."
        )


def contar_filtro_conteo_acumulado(contenido_excel, config_numerador: dict, anio: int | None = None, mes_nombre: str | None = None) -> tuple[dict, list[dict]]:
    """
    Filtra y cuenta el Excel del mes segun 'reporte.numerador' del mapeo.

    Retorna:
      - conteo_por_unidad: {nombre_unidad_canonico: conteo}, ya sumando los
        casos que cumplen el filtro directo (via 1).
      - candidatos_cruce: lista de dicts {"unidad": ..., "llave": ...} de las
        filas que no cumplen via 1 pero si tienen uno de los codigosCandidatos
        de 'cruce' -- pendientes de validar contra un segundo archivo.
    """
    hoja = config_numerador["hoja"]
    encabezado = config_numerador.get("encabezado", 1)
    filtro_columna = config_numerador["filtroColumna"]
    col_agrupacion = config_numerador["agrupacion"]
    cruce_cfg = config_numerador.get("cruce")

    df = pd.read_excel(contenido_excel, sheet_name=hoja, header=encabezado - 1)

    if anio is not None and mes_nombre is not None:
        _validar_mes_anio_archivo(df, anio, mes_nombre)

    # columna de agrupacion (ej. "undadAdscripcion") -> se busca por nombre en el encabezado real
    if col_agrupacion not in df.columns:
        raise KeyError(f"La columna de agrupacion '{col_agrupacion}' no existe en la hoja '{hoja}'")

    conteo_por_unidad: dict[str, int] = {}
    candidatos_cruce: list[dict] = []

    diag_letra = next((l for l, c in filtro_columna.items() if isinstance(c, dict) and c.get("nombreColumna") == "diagnosticoPrincipal"), None)
    diag_idx = letra_a_numero(diag_letra) if diag_letra else None
    diag_cfg = filtro_columna.get(diag_letra) if diag_letra else None
    # El resto de columnas (edad, tipoIngreso, ...) deben cumplirse SIEMPRE,
    # tanto para contar via 1 directo como para calificar como candidato via 2
    # -- si no, un candidato con tipoIngreso invalido igual colaria.
    filtros_base = {l: c for l, c in filtro_columna.items() if l != diag_letra}

    for _, fila in df.iterrows():
        clave_unidad = str(fila[col_agrupacion])[:6]
        nombre_unidad = CLAVE_UNIDADES_F.get(clave_unidad)
        if not nombre_unidad:
            continue  # unidad sin PAMF -- no se cuenta por unidad (igual que EH/DM ya validado)

        if filtros_base and not _fila_cumple(fila, filtros_base):
            continue

        if diag_cfg is not None and _cumple_condicion(fila.iloc[diag_idx], diag_cfg):
            conteo_por_unidad[nombre_unidad] = conteo_por_unidad.get(nombre_unidad, 0) + 1
            continue

        if cruce_cfg and cruce_cfg.get("activa") and diag_idx is not None:
            diag_valor = str(fila.iloc[diag_idx]).strip()
            if diag_valor in cruce_cfg["codigosCandidatos"]:
                llave_col = config_numerador.get("columnaLlaveCruce", "numeroAfiliacion")
                llave = fila[llave_col] if llave_col in df.columns else None
                candidatos_cruce.append({"unidad": nombre_unidad, "llave": llave})

    return conteo_por_unidad, candidatos_cruce


def validar_candidatos_cruce(candidatos_cruce: list[dict], contenido_excel_cruce, cruce_cfg: dict) -> dict:
    """
    Cruza los candidatos (via 2) contra el archivo del mismo mes indicado en
    'cruce.archivoCruce'. Por cada paciente valida si alguna de sus filas trae,
    en cualquiera de 'columnasDiagnostico', uno de los 'codigosValidos'.
    Retorna {nombre_unidad: cuantos candidatos se validaron}.
    """
    if not candidatos_cruce:
        return {}

    hoja = cruce_cfg.get("hoja", "Hoja1")
    encabezado = cruce_cfg.get("encabezado", 1)
    df = pd.read_excel(contenido_excel_cruce, sheet_name=hoja, header=encabezado - 1)

    col_llave = cruce_cfg["columnaLlave"]
    cols_diag = cruce_cfg["columnasDiagnostico"]
    codigos_validos = set(cruce_cfg["codigosValidos"])

    diag_por_paciente: dict[str, set] = {}
    for _, fila in df.iterrows():
        llave = fila.get(col_llave)
        if llave is None:
            continue
        diags = diag_por_paciente.setdefault(llave, set())
        for letra in cols_diag:
            idx = letra_a_numero(letra)
            if idx < len(fila):
                valor = fila.iloc[idx]
                if valor:
                    diags.add(str(valor).strip())

    validados_por_unidad: dict[str, int] = {}
    for candidato in candidatos_cruce:
        diags_paciente = diag_por_paciente.get(candidato["llave"], set())
        if diags_paciente & codigos_validos:
            unidad = candidato["unidad"]
            validados_por_unidad[unidad] = validados_por_unidad.get(unidad, 0) + 1

    return validados_por_unidad


# --------------------------------------------------------------------------- #
# 2) Guardado mensual (solo numerador, desempeno "Gris")
# --------------------------------------------------------------------------- #

def _leer_reporte(indicador: str, anio: int) -> dict:
    ruta = ruta_indicador_json(indicador, anio)
    if ruta.exists():
        return json.loads(ruta.read_text(encoding="utf-8"))
    return {"INDICADOR": indicador, "ANIO": anio, "MESES": {}}


def _guardar_reporte(indicador: str, anio: int, reporte: dict) -> None:
    ruta = ruta_indicador_json(indicador, anio)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(json.dumps(reporte, ensure_ascii=False, indent=2), encoding="utf-8")


def guardar_numerador_mes(indicador: str, anio: int, mes_nombre: str, conteo_por_unidad: dict) -> None:
    """
    Guarda (o reemplaza, si se re-sube el mismo mes) el numerador crudo de un
    mes -- siempre con las 46 unidades (mismo orden que NOMBREUNIDADESARCHIVO),
    las que no tuvieron ningun caso ese mes quedan en 0, no ausentes.
    """
    reporte = _leer_reporte(indicador, anio)
    reporte["MESES"][mes_nombre] = {
        unidad: {"numerador": conteo_por_unidad.get(unidad, 0), "desempeno": "Gris"}
        for unidad in NOMBREUNIDADESARCHIVO
    }
    _guardar_reporte(indicador, anio, reporte)


# --------------------------------------------------------------------------- #
# 3) Deteccion y calculo del corte (Semestral Anualizado)
# --------------------------------------------------------------------------- #

def _denominador_por_unidad(anio: int) -> dict[str, float]:
    ruta = ruta_poblacion(anio)
    if not ruta.exists():
        return {}
    poblacion = json.loads(ruta.read_text(encoding="utf-8")).get("POBLACION", {})
    columnas = ["20 a 24", "25  a 29", "30 a 34", "35 a 39", "40 a 44",
                "45 a 49", "50 a 54", "55 a 59", "60 a 64", "65 a 69", "70 a 74"]
    return {
        unidad: sum(datos.get("Todos", {}).get(c, 0) for c in columnas)
        for unidad, datos in poblacion.items()
    }


def intentar_generar_corte(indicador: str, anio: int, mes_nombre: str) -> dict | None:
    """
    Si 'mes_nombre' es un mes de corte (Junio/Diciembre) y ya estan los 12
    meses de la ventana correspondiente, calcula y guarda el corte final
    (numerador acumulado + denominador + resultado + semaforo).
    Retorna el bloque generado, o None si no aplicaba/no estaba completo.
    """
    if mes_nombre not in MESES_CORTE_SEMESTRAL:
        return None

    ventana = ventana_corte(mes_nombre, anio)  # [(mes, anio), ...] x12

    reportes_cache: dict[int, dict] = {}
    # arranca con las 46 unidades en cero, mismo orden que usan los demas
    # reportes (NOMBREUNIDADESARCHIVO) -- si no, una unidad sin ningun caso en
    # todo el año simplemente no aparecia en el corte, en vez de salir en 0.
    numerador_acumulado: dict[str, int] = {unidad: 0 for unidad in NOMBREUNIDADESARCHIVO}

    for mes, anio_mes in ventana:
        if anio_mes not in reportes_cache:
            reportes_cache[anio_mes] = _leer_reporte(indicador, anio_mes)
        datos_mes = reportes_cache[anio_mes]["MESES"].get(mes)
        if datos_mes is None:
            return None  # todavia no esta completa la ventana de 12 meses

        for unidad, dato in datos_mes.items():
            numerador_acumulado[unidad] = numerador_acumulado.get(unidad, 0) + (dato.get("numerador") or 0)

    # Poblacion base del corte: Junio usa la del año anterior (el corte
    # Jul[anio-1]-Jun[anio] cae mayormente en anio-1), Diciembre usa la del
    # mismo año (corte Ene-Dic[anio]).
    anio_poblacion = anio - 1 if mes_nombre == "Junio" else anio
    denominador_por_unidad = _denominador_por_unidad(anio_poblacion)
    mapeo = leer_mapeo_indicador(indicador)
    formula_resultado = mapeo["reporte"]["operacion"]["resultado"]

    bloque_corte: dict[str, UnidadDatos] = {}
    total_num = total_den = 0

    for unidad, numerador in numerador_acumulado.items():
        denominador = denominador_por_unidad.get(unidad)
        if not denominador:
            continue  # sin PAMF -- no entra a la tasa por unidad (solo al TOTAL_OOAD)

        total_num += numerador
        total_den += denominador
        contexto = {**_CONTEXTO_PERMITIDO, "numerador": numerador, "denominador": denominador}
        resultado = eval(formula_resultado, {"__builtins__": None}, contexto)

        # UnidadDatos.resultado usa alias "%" sin populate_by_name -- hay que
        # construirlo con el alias, si no el valor se descarta silenciosamente.
        bloque_corte[unidad] = UnidadDatos(**{"numerador": numerador, "denominador": denominador, "%": resultado, "desempeno": "Gris"})

    if total_den:
        contexto_total = {**_CONTEXTO_PERMITIDO, "numerador": total_num, "denominador": total_den}
        resultado_total = eval(formula_resultado, {"__builtins__": None}, contexto_total)
        bloque_corte["TOTAL_OOAD"] = UnidadDatos(**{"numerador": total_num, "denominador": total_den, "%": resultado_total, "desempeno": "Gris"})

    bloque_semaforizado = SemaforizarReporte(bloque_corte, indicador, mes=mes_nombre)

    reporte_anio_corte = reportes_cache[anio]
    reporte_anio_corte["MESES"][mes_nombre] = {
        unidad: dato.model_dump(by_alias=True) for unidad, dato in bloque_semaforizado.items()
    }
    _guardar_reporte(indicador, anio, reporte_anio_corte)

    return reporte_anio_corte["MESES"][mes_nombre]


# --------------------------------------------------------------------------- #
# 4) Orquestador: procesar la subida de un mes completo
# --------------------------------------------------------------------------- #

def estado_ventanas(anio_referencia: int, indicadores: list[str] | None = None) -> dict:
    """
    Para los cortes de Junio y Diciembre del anio de referencia (y el Junio
    siguiente, para ver que sigue despues), reporta cuantos de los 12 meses
    de cada ventana ya estan subidos -- pensado para que el front muestre
    "llevas 8 de 12 meses para el corte de Diciembre 2026".

    Un mes cuenta como "subido" solo si YA esta guardado para TODOS los
    indicadores de la lista (por default, todos los de INDICADORES_EXTRACTOR)
    -- una sola subida alimenta a todos a la vez, asi que deberian ir siempre
    parejos, pero se valida por si uno fallo y el otro no.

    Solo se incluye una ventana si la ventana anterior (6 meses antes) ya
    genero su corte -- la primera de la lista (Junio del anio de referencia)
    siempre se incluye. Asi no aparece, por ejemplo, "Junio 2027" mientras
    todavia no se cierra el corte de Diciembre 2026 -- no tiene caso mostrar
    una ventana en 0/12 cuando ni siquiera empezo su turno.
    """
    indicadores = indicadores or INDICADORES_EXTRACTOR
    cache: dict[tuple[str, int], dict] = {}
    resultado = {}
    anterior_generado = True

    for mes_corte, anio_corte in [("Junio", anio_referencia), ("Diciembre", anio_referencia), ("Junio", anio_referencia + 1)]:
        if not anterior_generado:
            break

        ventana = ventana_corte(mes_corte, anio_corte)
        detalle = []
        subidos = 0

        for mes, anio_mes in ventana:
            presente_en_todos = True
            for indicador in indicadores:
                clave_cache = (indicador, anio_mes)
                if clave_cache not in cache:
                    cache[clave_cache] = _leer_reporte(indicador, anio_mes)
                if cache[clave_cache]["MESES"].get(mes) is None:
                    presente_en_todos = False
            if presente_en_todos:
                subidos += 1
            detalle.append({"mes": mes, "anio": anio_mes, "subido": presente_en_todos})

        clave = f"{mes_corte} {anio_corte}"
        ya_generado = all(
            "TOTAL_OOAD" in (cache[(indicador, anio_corte)]["MESES"].get(mes_corte) or {})
            for indicador in indicadores
        )
        resultado[clave] = {
            "mesCorte": mes_corte,
            "anioCorte": anio_corte,
            "mesesSubidos": subidos,
            "mesesTotales": 12,
            "completo": subidos == 12,
            "corteYaGenerado": ya_generado,
            "detalle": detalle,
        }
        anterior_generado = ya_generado

    return resultado


def _procesar_archivo_mensual_indicador(indicador: str, anio: int, mes_nombre: str, contenido_excel, contenido_excel_cruce=None) -> dict:
    """Procesa el Excel del mes para UN indicador (ej. "EH 03"). Ver procesar_archivo_mensual()."""
    mapeo = leer_mapeo_indicador(indicador)
    config_numerador = mapeo["reporte"]["numerador"]

    conteo_por_unidad, candidatos_cruce = contar_filtro_conteo_acumulado(contenido_excel, config_numerador, anio=anio, mes_nombre=mes_nombre)

    cruce_cfg = config_numerador.get("cruce")
    validados = {}
    if cruce_cfg and cruce_cfg.get("activa") and contenido_excel_cruce is not None and candidatos_cruce:
        validados = validar_candidatos_cruce(candidatos_cruce, contenido_excel_cruce, cruce_cfg)
        for unidad, cantidad in validados.items():
            conteo_por_unidad[unidad] = conteo_por_unidad.get(unidad, 0) + cantidad

    guardar_numerador_mes(indicador, anio, mes_nombre, conteo_por_unidad)

    corte = intentar_generar_corte(indicador, anio, mes_nombre)

    return {
        "indicador": indicador,
        "anio": anio,
        "mes": mes_nombre,
        "numerador_por_unidad": conteo_por_unidad,
        "candidatos_via2": len(candidatos_cruce),
        "validados_via2": sum(validados.values()) if validados else 0,
        "corte_generado": corte is not None,
        "corte": corte,
    }


def procesar_archivo_mensual(anio: int, mes_nombre: str, contenido_bytes: bytes, contenido_cruce_bytes: bytes | None = None,
                              indicadores: list[str] | None = None) -> dict:
    """
    Punto de entrada del controller: un solo Excel del mes (+ su cruce) se
    procesa para TODOS los indicadores del extractor (EH 03 y DM 04 por
    ahora) -- cada uno con su propio filtro/codigos, del mismo archivo.
    """
    indicadores = indicadores or INDICADORES_EXTRACTOR
    resultados = {}
    for indicador in indicadores:
        excel = io.BytesIO(contenido_bytes)
        cruce = io.BytesIO(contenido_cruce_bytes) if contenido_cruce_bytes else None
        resultados[indicador] = _procesar_archivo_mensual_indicador(indicador, anio, mes_nombre, excel, cruce)
    return resultados


# --------------------------------------------------------------------------- #
# 5) Excel del corte -- reusa el mismo motor que FTP (generar_excel.py)
# --------------------------------------------------------------------------- #

def generar_excel_corte(indicador: str, anio: int, mes_corte: str) -> dict:
    """
    Arma el Excel de un corte ya generado (Junio o Diciembre), con el mismo
    motor y estilo que usa FTP (Excel_final/ExcelFinalConPlantilla) -- no se
    escribe un generador aparte. El mapeo nuevo (indicadores/mapeo/) tiene
    otra forma que el viejo de ftp/mapeo/ (informacion.titulo en vez de
    titulo suelto, etc.), asi que aqui se adapta el nombre de los campos;
    _checkpoints_y_etiquetas ya sabe mostrar solo Junio/Diciembre para la
    periodicidad "Semestral Anualizado" (ver generar_excel.py).
    """
    if mes_corte not in MESES_CORTE_SEMESTRAL:
        return {"status": "error", "mensaje": f"'{mes_corte}' no es un mes de corte valido -- debe ser Junio o Diciembre."}

    mapeo = leer_mapeo_indicador(indicador)
    informacion = mapeo.get("informacion", {})
    mes_num = str(MESES_CORTE_SEMESTRAL.index(mes_corte) * 6 + 6).zfill(2)  # Junio->06, Diciembre->12

    diccionarioPrevio, es_semana, semana = leer_mes_guardado(indicador, str(anio), mes_num)
    if diccionarioPrevio is None:
        return {"status": "error", "mensaje": f"{indicador} no tiene el corte de {mes_corte} {anio} generado todavia."}

    archivo_descargable = ExcelFinalConPlantilla(
        diccionarioPrevio,
        informacion.get("titulo", indicador),
        informacion.get("descNum", ""),
        informacion.get("descDen", ""),
        indicador.replace(" ", "_"),
        str(anio),
        mes_num,
        semana,
        mapeo.get("semaforo", {}),
        indicador,
        es_semana=es_semana,
        periodicidad=mapeo.get("periodicidad"),
    )

    if not archivo_descargable:
        return {"status": "error", "mensaje": "No se pudo generar el archivo Excel"}

    return {
        "status": "success",
        "mensaje": f"Reporte {indicador} -- corte {mes_corte} {anio} obtenido correctamente",
        "stream": archivo_descargable,
        "nombre_archivo": f"{indicador.replace(' ', '_')}_{anio}_{mes_corte}.xlsx",
    }


def generar_excel_familia(anio: int, mes_corte: str, indicadores: list[str] | None = None) -> dict:
    """
    Igual que generar_excel_corte, pero arma UN solo Excel con una pestaña por
    indicador del extractor (EH 03, DM 04) -- "toda la familia" del corte,
    mismo criterio que /generar-categoria/guardado usa para FTP (una pestana
    por indicador con escribir_hoja_indicador, reutilizado tal cual).
    """
    if mes_corte not in MESES_CORTE_SEMESTRAL:
        return {"status": "error", "mensaje": f"'{mes_corte}' no es un mes de corte valido -- debe ser Junio o Diciembre."}

    indicadores = indicadores or INDICADORES_EXTRACTOR
    mes_num = str(MESES_CORTE_SEMESTRAL.index(mes_corte) * 6 + 6).zfill(2)  # Junio->06, Diciembre->12

    output = io.BytesIO()
    wb = xlsxwriter.Workbook(output)
    wb.set_properties({'author': 'Web CIAE'})
    fmt = obtener_estilos_excel(wb)

    completados = []
    errores = {}

    for indicador in indicadores:
        mapeo = leer_mapeo_indicador(indicador)
        informacion = mapeo.get("informacion", {})

        diccionarioPrevio, es_semana, semana = leer_mes_guardado(indicador, str(anio), mes_num)
        if diccionarioPrevio is None:
            errores[indicador] = f"{indicador} no tiene el corte de {mes_corte} {anio} generado todavia."
            continue

        metadata = {
            "titulo":       informacion.get("titulo"),
            "desNum":       informacion.get("descNum"),
            "desDen":       informacion.get("descDen"),
            "arch":         indicador.replace(" ", "_"),
            "semaforo":     mapeo.get("semaforo", {}),
            "decimales":    None,
            "periodicidad": mapeo.get("periodicidad"),
        }
        try:
            escribir_hoja_indicador(wb, fmt, indicador, diccionarioPrevio, metadata, str(anio), mes_num, semana, es_semana)
            completados.append(indicador)
        except Exception as exc:
            errores[indicador] = str(exc)

    wb.close()

    if not completados:
        return {"status": "error", "mensaje": "Ningun indicador tiene el corte generado todavia.", "errores": errores}

    output.seek(0)
    return {
        "status": "success",
        "mensaje": f"Corte {mes_corte} {anio} obtenido correctamente",
        "stream": output,
        "nombre_archivo": f"Extractor_{anio}_{mes_corte}.xlsx",
        "completados": completados,
        "errores": errores,
    }
