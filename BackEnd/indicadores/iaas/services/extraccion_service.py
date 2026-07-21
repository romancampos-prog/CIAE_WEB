"""
Extrae numerador y denominador de los Excel subidos, calcula tasa y semáforo.
Usado en: iass/services/procesar_service.py
"""
import io
import json
import pandas as pd
from openpyxl.utils import column_index_from_string
from iaas.config import UNIDADES_HGS_IAAS01, ORDEN_IAAS01, ORDEN_DEMAS_IAAS, UNIDAD_TIPO_IAAS01
from iaas.services.info_service import obtener_config_indicador
from iaas.services.calculos_iaas import _alias_hgsz
from shared.color_service import resolver_color

# UNIDAD_TIPO_IAAS01 solo tiene los nombres canonicos (HGS/HGSMF); el dato crudo a veces
# trae el alias HGSZ/HGSZMF. Mismo criterio que _dato_unidad en generar_iaas.py.
_ALIAS_TIPO_IAAS01 = {
    alias: tipo for nombre, tipo in UNIDAD_TIPO_IAAS01.items()
    for alias in [_alias_hgsz(nombre)] if alias
}


def _letra(col: str) -> int:
    return column_index_from_string(col) - 1


def _validar_encabezado_excel(excel_bytes: bytes, unidad_esperada: str, config_numerador: dict) -> list[str]:
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

    # Valida que el Excel pertenece a la unidad esperada usando columna E.
    # Compara tipo + número (ej. "HGZMF 2") para tolerar variaciones de nombre de ciudad.
    if unidad_esperada and not errores:
        col_e = _letra("E")
        try:
            vals = df.iloc[:, col_e].dropna()
            if len(vals) > 0:
                def _clave(nombre: str) -> str:
                    tokens = nombre.strip().upper().split()
                    if len(tokens) < 2:
                        return nombre.strip().upper()
                    tipo = tokens[0]
                    # HGS == HGSZ, HGSMF == HGSZMF: quitar la Z intermedia
                    if tipo.startswith('HGSZ'):
                        tipo = 'HGS' + tipo[4:]
                    return f"{tipo} {tokens[1]}"

                excel_clave    = _clave(str(vals.iloc[0]))
                esperada_clave = _clave(unidad_esperada)
                if excel_clave != esperada_clave:
                    errores.append(
                        f"El Excel pertenece a '{vals.iloc[0].strip()}', "
                        f"no a '{unidad_esperada}'. Verifica que subiste el archivo correcto."
                    )
        except Exception:
            pass

    return errores


def calcular_IAAS(indicador: str, numeradores: dict, denominador=None) -> dict:
    resultado = {}

    if indicador == "IAAS 01":
        if denominador is None:
            return {}
        dens = _get_denominador_IAAS01(denominador)
        nums = _get_numerador(numeradores, indicador)

        # Se recorre la lista completa de unidades esperadas (no solo las que trajeron
        # numerador o denominador) para que ninguna quede fuera del JSON aunque no
        # tenga ningun dato ese mes -- queda con null en vez de simplemente no existir.
        for u in set(ORDEN_IAAS01) | set(nums) | set(dens):
            resultado[u] = {
                # nums.get(u) sin default: si la unidad nunca se subio, queda None
                # (incompleto) en vez de simular un 0 real que nunca se reporto.
                "numerador":   nums.get(u),
                "denominador": dens.get(u)
            }
        return _semaforo_IAAS01(resultado)

    else:
        nums     = _get_numerador(numeradores, indicador)
        dens_raw = (denominador or {}).get(indicador, {})
        dens     = {u: int(v) for u, v in dens_raw.items() if v}

        # Se recorre la lista completa de unidades esperadas (no solo las que trajeron
        # numerador o denominador) para que ninguna quede fuera del JSON aunque no
        # tenga ningun dato ese mes -- queda con null en vez de simplemente no existir.
        for u in set(ORDEN_DEMAS_IAAS) | set(nums) | set(dens):
            if u == "DELEGACION":
                continue
            resultado[u] = {
                # nums.get(u) sin default: si la unidad nunca se subio, queda None
                # (incompleto) en vez de simular un 0 real que nunca se reporto.
                "numerador":   nums.get(u),
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

    resultado["DELEGACION"] = sum(v for v in resultado.values() if v is not None)
    return resultado


def _get_denominador_IAAS01(excel_bytes: bytes) -> dict:
    config     = obtener_config_indicador("IAAS 01")
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
        numeros_esperados = [u.split()[1] for u in ORDEN_IAAS01]
        if not any(col_b.str.contains(rf'\b{num}\b', na=False).any() for num in numeros_esperados):
            errores.append("[Denominador global] No se encontraron las unidades de IAAS 01 en la columna de unidades.")

    if errores:
        raise ValueError(json.dumps(errores))

    resultado = {}

    for unidad in ORDEN_IAAS01:
        numero = unidad.split()[1]
        df_unidad = df[
            df.iloc[:, _letra(col_unidad)].str.contains(rf'\b{numero}\b', na=False) &
            (df.iloc[:, _letra(col_filtro)] == val_filtro)
        ]
        resultado[unidad] = (
            int(df_unidad.iloc[:, _letra(tomar)].values[0])
            if len(df_unidad) > 0 else None
        )

    resultado["DELEGACION"] = sum(v for v in resultado.values() if v is not None)
    return resultado


def _semaforo_general(IAAS: dict, indicador: str) -> dict:
    umbrales         = obtener_config_indicador(indicador).get("Semaforo", {})
    umbral_esperado  = umbrales.get("Esperado")
    umbral_medio     = umbrales.get("Medio")
    tasa_multiplicar = umbrales.get("Tasa")
    resultado        = {}

    def calcular_tasa(numerador, denominador):
        return round((numerador / denominador) * tasa_multiplicar, 2)

    def evaluar_umbral(tasa):
        if tasa > umbral_esperado.get("Menor"):
            return "Bajo"
        if tasa >= umbral_esperado.get("Mayor"):
            return "Esperado"
        if tasa >= umbral_medio.get("Mayor"):
            return "Medio"
        return "Bajo"

    for unidad, data in IAAS.items():
        numerador   = data.get("numerador")
        denominador = data.get("denominador")
        tasa, color = resolver_color(numerador, denominador, calcular_tasa, evaluar_umbral)

        resultado[unidad] = {
            "numerador":   numerador,
            "denominador": denominador,
            "tasa":        tasa,
            "color":       color
        }
    return resultado


def calcular_unidad_tardia(
    unidad: str,
    excel_unidad: bytes | None,
    indicadores_seleccionados: list,
    denominadores_02_06: dict,
    datos_sesion: dict,
) -> dict:
    """
    Recalcula los indicadores seleccionados para una única unidad tardía.
    Si excel_unidad es None, reutiliza el numerador ya guardado en sesión.
    """
    if excel_unidad is not None:
        config_num = obtener_config_indicador(indicadores_seleccionados[0]).get("Numerador", {}) if indicadores_seleccionados else {}
        errs = _validar_encabezado_excel(excel_unidad, unidad, config_num)
        if errs:
            raise ValueError(json.dumps(errs))
        nums_unidad = {unidad: excel_unidad}
    else:
        nums_unidad = None

    resultado = {}

    for ind in indicadores_seleccionados:
        if ind == "IAAS 01":
            if unidad not in ORDEN_IAAS01:
                continue
            num = (
                _get_numerador(nums_unidad, "IAAS 01").get(unidad, 0)
                if nums_unidad is not None
                else (datos_sesion.get("IAAS 01", {}).get(unidad) or {}).get("numerador")
            )
            den = (datos_sesion.get("IAAS 01", {}).get(unidad) or {}).get("denominador")
            raw = {unidad: {"numerador": num, "denominador": den}}
            resultado["IAAS 01"] = _semaforo_IAAS01(raw)
        else:
            num = (
                _get_numerador(nums_unidad, ind).get(unidad, 0)
                if nums_unidad is not None
                else (datos_sesion.get(ind, {}).get(unidad) or {}).get("numerador")
            )
            den_v = str(denominadores_02_06.get(ind, "")).strip()
            den = int(den_v) if den_v.isdigit() else (datos_sesion.get(ind, {}).get(unidad) or {}).get("denominador")
            raw = {unidad: {"numerador": num, "denominador": den}}
            resultado[ind] = _semaforo_general(raw, ind)

    return resultado


def _semaforo_IAAS01(IAAS: dict) -> dict:
    semaforo_json    = obtener_config_indicador("IAAS 01").get("Semaforo", {})
    tasa_multiplicar = semaforo_json.get("Tasa")
    resultado        = {}

    def calcular_tasa(numerador, denominador):
        return round((numerador / denominador) * tasa_multiplicar, 2)

    def evaluar_umbral(tasa, unidad):
        tipo     = UNIDAD_TIPO_IAAS01.get(unidad) or _ALIAS_TIPO_IAAS01.get(unidad, "OOAD")
        umbrales = semaforo_json.get(tipo) or semaforo_json.get("OOAD", {})
        esperado = umbrales.get("Esperado", {})
        medio    = umbrales.get("Medio", {})
        if esperado.get("Mayor") <= tasa <= esperado.get("Menor"):
            return "Esperado"
        if medio.get("Mayor") <= tasa < medio.get("Menor"):
            return "Medio"
        return "Bajo"

    for unidad, data in IAAS.items():
        numerador   = data.get("numerador")
        denominador = data.get("denominador")
        tasa, color = resolver_color(
            numerador, denominador,
            calcular_tasa,
            lambda t, u=unidad: evaluar_umbral(t, u),
        )

        resultado[unidad] = {
            "numerador":   numerador,
            "denominador": denominador,
            "tasa":        tasa,
            "color":       color
        }
    return resultado
