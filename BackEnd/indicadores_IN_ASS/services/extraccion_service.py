"""
Módulo  : extraccion_service.py
Carpeta : indicadores_IN_ASS/services/
Qué hace: Extrae numerador y denominador de los Excel subidos, calcula tasa y semáforo.
Usado en: procesar_service.py
"""
import io
import json
import pandas as pd
from openpyxl.utils import column_index_from_string
from configs.unidades import UNIDADES_HGS_IN_ASS01, ORDEN_IN_ASS01
from indicadores_IN_ASS.services.info_service import obtener_config_indicador


def _letra(col: str) -> int:
    return column_index_from_string(col) - 1


def _validar_encabezado_excel(excel_bytes: bytes, unidad_esperada: str, config_numerador: dict) -> list[str]:
    """
    Verifica que el Excel sea el correcto para el indicador.
    Retorna lista de errores encontrados (vacía si todo está bien).
    """
    cfg = config_numerador.get("encabezado")
    if not cfg:
        return []

    hoja        = cfg.get("hoja", config_numerador.get("hoja"))
    fila_header = int(cfg.get("fila_header", 5))
    prefijo     = f"[{unidad_esperada}] " if unidad_esperada else ""
    errores     = []

    try:
        df = pd.read_excel(io.BytesIO(excel_bytes), sheet_name=hoja, header=fila_header - 1)
    except ValueError:
        return [f"{prefijo}El Excel no contiene la hoja '{hoja}'."]
    except Exception:
        return []

    for col_letra, nombre_esperado in cfg.get("columnas_esperadas", {}).items():
        col_idx = _letra(col_letra)
        try:
            nombre_real = str(df.columns[col_idx]).strip()
        except IndexError:
            errores.append(f"{prefijo}Falta la columna '{col_letra}' (se esperaba '{nombre_esperado}').")
            continue
        if nombre_real.upper() != nombre_esperado.strip().upper():
            errores.append(
                f"{prefijo}Columna '{col_letra}': dice '{nombre_real}' "
                f"(se esperaba '{nombre_esperado}')."
            )
    return errores


def calcular_in_ass(indicador: str, numeradores: dict, denominador=None) -> dict:
    resultado = {}

    if indicador == "IN_ASS 01":
        if denominador is None:
            return {}
        dens = _get_denominador_in_ass01(denominador)
        nums = _get_numerador(numeradores, indicador)

        for u in set(nums) | set(dens):
            resultado[u] = {
                "numerador":   nums.get(u, 0),
                "denominador": dens.get(u)
            }
        return _semaforo_in_ass01(resultado)

    else:
        nums     = _get_numerador(numeradores, indicador)
        dens_raw = (denominador or {}).get(indicador, {})
        dens     = {u: int(v) for u, v in dens_raw.items() if v}

        for u in set(nums) | set(dens):
            if u == "Delegación":
                continue
            resultado[u] = {
                "numerador":   nums.get(u, 0),
                "denominador": dens.get(u)
            }
        return _semaforo_general(resultado, indicador)


def _get_numerador(lista_exceles: dict, indicador: str) -> dict:
    config  = obtener_config_indicador(indicador)
    num     = config.get("Numerador", {})
    hoja    = num.get("hoja")
    filtros = num.get("filtros", {})
    tomar   = num.get("tomar")

    resultado = {}
    errores   = []

    for unidad, xlsx in lista_exceles.items():
        errs = _validar_encabezado_excel(xlsx, unidad, num)
        if errs:
            errores.extend(errs)
            continue
        try:
            df = pd.read_excel(io.BytesIO(xlsx), sheet_name=hoja)
        except ValueError:
            errores.append(f"[{unidad}] No contiene la hoja '{hoja}'.")
            continue

        for col, val in filtros.items():
            if val.startswith("^"):
                term = val[1:].upper()
                df = df[df.iloc[:, _letra(col)].str.upper().str.match(rf'^{term}(\s|$)')]
            else:
                df = df[df.iloc[:, _letra(col)].str.upper().str.strip() == val.upper().strip()]

        resultado[unidad] = (
            len(df) if tomar == "conteo"
            else int(df.iloc[:, _letra(tomar)].values[0]) if len(df) > 0
            else None
        )

    if errores:
        raise ValueError(json.dumps(errores))

    resultado["Delegación"] = sum(v for v in resultado.values() if v is not None)
    return resultado


def _get_denominador_in_ass01(excel_bytes: bytes) -> dict:
    config     = obtener_config_indicador("IN_ASS 01")
    den        = config.get("Denominador", {})
    hoja       = den.get("hoja")
    filtros    = den.get("filtros", {})
    col_unidad = den.get("col_unidad")
    tomar      = den.get("tomar")

    col_filtro, val_filtro = next(iter(filtros.items()))
    errores = []

    errs = _validar_encabezado_excel(excel_bytes, "", den)
    errores.extend(errs)

    if not errores:
        try:
            df = pd.read_excel(io.BytesIO(excel_bytes), sheet_name=hoja)
        except ValueError:
            errores.append(f"[Denominador global] No contiene la hoja '{hoja}'.")
            raise ValueError(json.dumps(errores))

        col_b = df.iloc[:, _letra(col_unidad)].astype(str)
        numeros_esperados = [u.split()[1] for u in ORDEN_IN_ASS01]
        if not any(col_b.str.contains(rf'\b{num}\b', na=False).any() for num in numeros_esperados):
            errores.append("[Denominador global] No se encontraron las unidades de IN_ASS 01 en la columna de unidades.")

    if errores:
        raise ValueError(json.dumps(errores))

    resultado = {}

    for unidad in ORDEN_IN_ASS01:
        numero = unidad.split()[1]
        df_unidad = df[
            df.iloc[:, _letra(col_unidad)].str.contains(rf'\b{numero}\b', na=False) &
            (df.iloc[:, _letra(col_filtro)] == val_filtro)
        ]
        resultado[unidad] = (
            int(df_unidad.iloc[:, _letra(tomar)].values[0])
            if len(df_unidad) > 0 else None
        )

    resultado["Delegación"] = sum(v for v in resultado.values() if v is not None)
    return resultado


def _semaforo_general(in_ass: dict, indicador: str) -> dict:
    umbrales         = obtener_config_indicador(indicador).get("Semaforo", {})
    umbral_esperado  = umbrales.get("Esperado")
    umbral_medio     = umbrales.get("Medio")
    tasa_multiplicar = umbrales.get("Tasa")
    resultado        = {}

    for unidad, data in in_ass.items():
        numerador   = data.get("numerador")
        denominador = data.get("denominador")
        tasa = round(((numerador or 0) / denominador) * tasa_multiplicar, 2) if denominador else None

        if tasa is None:
            color = "Rojo"
        elif tasa > umbral_esperado.get("Menor"):
            color = "Rojo"
        elif tasa >= umbral_esperado.get("Mayor"):
            color = "Verde"
        elif tasa >= umbral_medio.get("Mayor"):
            color = "Amarillo"
        else:
            color = "Rojo"

        resultado[unidad] = {
            "numerador":   numerador,
            "denominador": denominador,
            "tasa":        tasa,
            "color":       color
        }
    return resultado


def calcular_unidad_tardia(
    unidad: str,
    excel_unidad: bytes,
    indicadores_seleccionados: list,
    denominadores_02_06: dict,
    datos_sesion: dict,
) -> dict:
    """
    Recalcula los indicadores seleccionados para una única unidad tardía.
    IN_ASS 01: numerador del nuevo Excel + denominador almacenado en sesión.
    IN_ASS 02-06: numerador del nuevo Excel + denominador enviado por el usuario
                  (si viene vacío usa el almacenado en sesión).
    Devuelve: {ind_id: {unidad: {numerador, denominador, tasa, color}}}
    """
    # Validar que el Excel pertenece a la unidad antes de procesar
    config_num = obtener_config_indicador(indicadores_seleccionados[0]).get("Numerador", {}) if indicadores_seleccionados else {}
    errs = _validar_encabezado_excel(excel_unidad, unidad, config_num)
    if errs:
        raise ValueError(json.dumps(errs))

    nums_unidad = {unidad: excel_unidad}
    resultado   = {}

    for ind in indicadores_seleccionados:
        if ind == "IN_ASS 01":
            if unidad not in ORDEN_IN_ASS01:
                continue
            num = _get_numerador(nums_unidad, "IN_ASS 01").get(unidad, 0)
            den = (datos_sesion.get("IN_ASS 01", {}).get(unidad) or {}).get("denominador")
            raw = {unidad: {"numerador": num, "denominador": den}}
            resultado["IN_ASS 01"] = _semaforo_in_ass01(raw)
        else:
            num   = _get_numerador(nums_unidad, ind).get(unidad, 0)
            den_v = str(denominadores_02_06.get(ind, "")).strip()
            if den_v.isdigit():
                den = int(den_v)
            else:
                den = (datos_sesion.get(ind, {}).get(unidad) or {}).get("denominador")
            raw = {unidad: {"numerador": num, "denominador": den}}
            resultado[ind] = _semaforo_general(raw, ind)

    return resultado


def _semaforo_in_ass01(in_ass: dict) -> dict:
    semaforo_json    = obtener_config_indicador("IN_ASS 01").get("Semaforo", {})
    hgs_semaforo     = semaforo_json.get("HGS")
    otros_semaforo   = semaforo_json.get("Otros")
    tasa_multiplicar = semaforo_json.get("Tasa")
    unidades_hgs     = set(UNIDADES_HGS_IN_ASS01)
    resultado        = {}

    for unidad, data in in_ass.items():
        numerador   = data.get("numerador")
        denominador = data.get("denominador")
        tasa = round(((numerador or 0) / denominador) * tasa_multiplicar, 2) if denominador else None

        umbrales = hgs_semaforo if unidad in unidades_hgs else otros_semaforo
        esperado = umbrales.get("Esperado")
        medio    = umbrales.get("Medio")

        if tasa is None:
            color = "Rojo"
        elif esperado.get("Mayor") <= tasa <= esperado.get("Menor"):
            color = "Verde"
        elif medio.get("Mayor") <= tasa < medio.get("Menor"):
            color = "Amarillo"
        else:
            color = "Rojo"

        resultado[unidad] = {
            "numerador":   numerador,
            "denominador": denominador,
            "tasa":        tasa,
            "color":       color
        }
    return resultado
