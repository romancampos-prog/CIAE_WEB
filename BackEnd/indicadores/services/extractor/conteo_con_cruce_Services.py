"""
Conteo de los indicadores de corte con cruce (EH 03, DM 04): via 1 (cumple el filtro directo) y
candidatos de la via 2, que se confirman contra el archivo de Egresos del mismo mes.
Usado en: services/extractor/generar_corte_Services.py
"""
from compartido.extraccion_excel.columnas_excel import letra_a_numero
from compartido.extraccion_excel.detalle_extraccion_Model import CondicionFiltro
from compartido.extraccion_excel.modos_por_filtro.cumple_condicion_Services import cumple_condicion
from compartido.extraccion_excel.modos_por_filtro.fila_cumple_Services import fila_cumple
from compartido.extraccion_excel.motor_extraccion_Services import columnas_esperadas
from datos.excel_subido.lector_excel_Datos import LectorExcel, numeros_escritos_como_texto
from services.extractor.leer_archivo_extractor_Services import columnas_por_nombre, validar_mes_anio_archivo
from shared.UNIDADES import CLAVE_UNIDADES_F


def contar_filtro_conteo_acumulado(lector: LectorExcel, config_numerador: dict, anio: int, mes_nombre: str) -> tuple[dict, list[dict]]:
    """
    Filtra y cuenta el Excel del mes segun 'reporte.numerador' del mapeo.

    Retorna:
      - conteo_por_unidad: {nombre_unidad_canonico: conteo}, ya sumando los
        casos que cumplen el filtro directo (via 1).
      - candidatos_cruce: lista de dicts {"unidad": ..., "llave": ...} de las
        filas que no cumplen via 1 pero si tienen uno de los codigosCandidatos
        de 'cruce' -- pendientes de validar contra un segundo archivo.
    """

    encabezado = config_numerador.get("encabezado", 1)
    filtro_columna = config_numerador["filtroColumna"]
    col_agrupacion = config_numerador["agrupacion"]
    cruce_cfg = config_numerador.get("cruce")

    # La hoja elegida ya trae los encabezados del mapeo en sus letras (y la de unidad, ej. "undadAdscripcion").
    df = lector.hoja_con_columnas(
        columnas_esperadas("FILTRO_CONTEO_ACUMULADO", config_numerador), encabezado, columnas_por_nombre(config_numerador),
    )
    df = numeros_escritos_como_texto(df, config_numerador)

    validar_mes_anio_archivo(df, anio, mes_nombre, config_numerador.get("columnasPeriodo"))

    conteo_por_unidad: dict[str, int] = {}
    candidatos_cruce: list[dict] = []

    # Se tipa una sola vez fuera del loop (no por fila) -- CondicionFiltro.model_validate
    # tiene costo real si se repite miles de veces en un SUI-13 grande.
    filtro_columna_tipado = {
        letra: CondicionFiltro.model_validate(cfg if isinstance(cfg, dict) else {"filtro": cfg})
        for letra, cfg in filtro_columna.items()
    }

    diag_letra = next((l for l, c in filtro_columna.items() if isinstance(c, dict) and c.get("nombreColumna") == "diagnosticoPrincipal"), None)
    diag_idx = letra_a_numero(diag_letra) if diag_letra else None
    diag_cfg = filtro_columna_tipado.get(diag_letra) if diag_letra else None
    # El resto de columnas (edad, tipoIngreso, ...) deben cumplirse SIEMPRE,
    # tanto para contar via 1 directo como para calificar como candidato via 2
    # -- si no, un candidato con tipoIngreso invalido igual colaria.
    filtros_base = {l: c for l, c in filtro_columna_tipado.items() if l != diag_letra}

    for _, fila in df.iterrows():
        clave_unidad = str(fila[col_agrupacion])[:6]
        nombre_unidad = CLAVE_UNIDADES_F.get(clave_unidad)

        if not nombre_unidad:
            continue  # unidad sin PAMF -- no se cuenta por unidad (igual que EH/DM ya validado)

        if filtros_base and not fila_cumple(fila, filtros_base):
            continue

        if diag_cfg is not None and cumple_condicion(fila.iloc[diag_idx], diag_cfg):
            conteo_por_unidad[nombre_unidad] = conteo_por_unidad.get(nombre_unidad, 0) + 1
            continue

        if cruce_cfg and cruce_cfg.get("activa") and diag_idx is not None:
            diag_valor = str(fila.iloc[diag_idx]).strip()

            if diag_valor in cruce_cfg["codigosCandidatos"]:
                llave_col = config_numerador.get("columnaLlaveCruce", "numeroAfiliacion")
                llave = fila[llave_col] if llave_col in df.columns else None
                candidatos_cruce.append({"unidad": nombre_unidad, "llave": llave})

    return conteo_por_unidad, candidatos_cruce


##--------------------------------------

def validar_candidatos_cruce(candidatos_cruce: list[dict], contenido_excel_cruce: LectorExcel, cruce_cfg: dict) -> dict:
    """
    Cruza los candidatos (via 2) contra el archivo del mismo mes indicado en
    'cruce.archivoCruce'. Por cada paciente valida si alguna de sus filas trae,
    en cualquiera de 'columnasDiagnostico', uno de los 'codigosValidos'.
    Retorna {nombre_unidad: cuantos candidatos se validaron}.
    """

    if not candidatos_cruce:
        return {}

    col_llave = cruce_cfg["columnaLlave"]
    cols_diag = cruce_cfg["columnasDiagnostico"]   # {letra: encabezado}
    df = contenido_excel_cruce.hoja_con_columnas(cols_diag, cruce_cfg.get("encabezado", 1), [col_llave])
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
