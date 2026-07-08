"""
Procesa el Excel de población nacional, filtra Guanajuato y guarda POBLACION.json.
Usado en: ftp_indicadores/controllers/poblacion_controller.py
"""
import io
import re
import json
import pandas as pd
from ftp_indicadores.config import NOMBREUNIDADESARCHIVO
from ftp_indicadores.config import RUTA_POBLACION, RUTA_MAPEO_POBLACION

DELEGACION_FILTRO = "Guanajuato"


def _cargar_mapeo() -> dict:
    with open(RUTA_MAPEO_POBLACION, "r", encoding="utf-8") as f:
        return json.load(f)


def _buscar_columna(fila, texto: str):
    for idx, val in enumerate(fila):
        if str(val).strip() == texto:
            return idx
    return None


def _cel_str(v):
    s = str(v).strip()
    return s[:-2] if (s.endswith('.0') and s[:-2].lstrip('-').isdigit()) else s


def _limpiar(v):
    if v is None:
        return None
    if isinstance(v, float) and (v != v or v in (float('inf'), float('-inf'))):
        return None
    s = str(v).strip()
    return None if s in ('', 'nan', 'NaN', 'None') else v


def _extraer_numero(nombre: str):
    m = re.search(r'\b0*(\d+)\b', nombre)
    return m.group(1) if m else None


def _sugerir_alias(no_encontradas: list, extras: list) -> dict:
    sugeridos = {}
    usados = set()
    for sistema in no_encontradas:
        num_s = _extraer_numero(sistema)
        if not num_s:
            continue
        for excel in extras:
            if excel in usados:
                continue
            num_e = _extraer_numero(excel)
            if num_e == num_s:
                sugeridos[excel.lower()] = sistema
                usados.add(excel)
                break
    return sugeridos


def procesar_archivo_poblacion(contenido_bytes: bytes, nombre_archivo: str) -> dict:
    try:
        mapeo  = _cargar_mapeo()
        buffer = io.BytesIO(contenido_bytes)

        crudo = pd.read_excel(buffer, sheet_name=mapeo["hoja"], header=None, usecols="A:EJ")

        fila_grupos      = crudo.iloc[mapeo["fila_grupos"] - 1]
        fila_encabezados = crudo.iloc[mapeo["fila_encabezados"] - 1]
        datos            = crudo.iloc[mapeo["fila_encabezados"]:]

        col_delegacion = _buscar_columna(fila_grupos, mapeo["columnas_unicas"]["delegacion"])
        col_unidad     = _buscar_columna(fila_grupos, mapeo["columnas_unicas"]["unidad"])

        if col_delegacion is None or col_unidad is None:
            faltante = mapeo["columnas_unicas"]["delegacion"] if col_delegacion is None else mapeo["columnas_unicas"]["unidad"]
            return {"ok": False, "detalle": f"No se encontró la columna '{faltante}' en el Excel."}

        encabezados_edad = mapeo["encabezados_edad"]
        n_cols = len(encabezados_edad)

        bloques = {}
        for grupo, info in mapeo["bloques_edad"].items():
            etiqueta = info["etiqueta_grupo"]
            inicio   = _buscar_columna(fila_grupos, etiqueta)
            if inicio is None:
                return {"ok": False, "detalle": f"No se encontró el bloque '{etiqueta}' en el Excel."}

            fin    = inicio + n_cols - 1
            reales = [_cel_str(v) for v in fila_encabezados.iloc[inicio:fin + 1]]
            if reales != encabezados_edad:
                return {"ok": False, "detalle": f"Las columnas del bloque '{etiqueta}' no coinciden con lo esperado."}

            bloques[grupo] = (inicio, fin)

        df_gto = datos[
            datos[col_delegacion].astype(str).str.strip() == DELEGACION_FILTRO
        ].copy()

        if df_gto.empty:
            return {"ok": False, "detalle": f"No hay filas con '{DELEGACION_FILTRO}' en el Excel."}

        resultado     = {}
        errores_datos = []

        for _, fila in df_gto.iterrows():
            unidad = str(fila[col_unidad]).strip()
            if not unidad or unidad == "nan":
                continue

            resultado[unidad] = {}
            for grupo, (inicio, fin) in bloques.items():
                valores = {}
                for i in range(n_cols):
                    valor = _limpiar(fila[inicio + i])
                    valores[encabezados_edad[i]] = valor
                    if valor is None:
                        errores_datos.append({"unidad": unidad, "grupo": grupo, "columna": encabezados_edad[i]})
                resultado[unidad][grupo] = valores

        alias_raw             = mapeo.get("alias", {})
        alias_excel_a_sistema = {k.lower(): v for k, v in alias_raw.items() if v is not None}
        alias_ignorar         = {k.lower() for k, v in alias_raw.items() if v is None}
        alias_sistema_a_excel = {v.lower(): k for k, v in alias_excel_a_sistema.items()}

        resultado_lower    = {k.lower(): k for k in resultado}
        resultado_ordenado = {}
        no_encontradas     = []

        for nombre_ref in NOMBREUNIDADESARCHIVO:
            nombre_ref_lower = nombre_ref.lower()
            clave_excel      = resultado_lower.get(nombre_ref_lower)
            if clave_excel is not None:
                resultado_ordenado[nombre_ref] = resultado[clave_excel]
                continue
            excel_lower = alias_sistema_a_excel.get(nombre_ref_lower)
            if excel_lower:
                clave_excel = resultado_lower.get(excel_lower)
                if clave_excel is not None:
                    resultado_ordenado[nombre_ref] = resultado[clave_excel]
                    continue
            no_encontradas.append(nombre_ref)

        sistema_lower_set = {n.lower() for n in NOMBREUNIDADESARCHIVO}
        extras = []
        for k in resultado:
            k_lower = k.lower()
            if k_lower in sistema_lower_set:
                continue
            if k_lower in alias_ignorar:
                continue
            alias_nombre = alias_excel_a_sistema.get(k_lower)
            if alias_nombre and alias_nombre.lower() not in sistema_lower_set:
                resultado_ordenado[alias_nombre] = resultado[k]
            elif not alias_nombre:
                extras.append(k)
                resultado_ordenado[k] = resultado[k]

        alias_sugeridos = _sugerir_alias(no_encontradas, extras) if (no_encontradas and extras) else {}

        if no_encontradas:
            print(f"[ADVERTENCIA] En NOMBREUNIDADESARCHIVO pero NO en Excel: {no_encontradas}")
        if extras:
            print(f"[ADVERTENCIA] En Excel pero NO en NOMBREUNIDADESARCHIVO: {extras}")

        RUTA_POBLACION.parent.mkdir(parents=True, exist_ok=True)
        with open(RUTA_POBLACION, "w", encoding="utf-8") as f:
            json.dump(resultado_ordenado, f, indent=2, ensure_ascii=False)

        return {
            "ok":              True,
            "detalle":         f"Procesadas {len(resultado_ordenado)} unidades de {DELEGACION_FILTRO}.",
            "nombre":          nombre_archivo,
            "unidades":        len(resultado_ordenado),
            "no_encontradas":  no_encontradas,
            "extras":          extras,
            "celdas_vacias":   len(errores_datos),
            "errores_datos":   errores_datos,
            "alias_sugeridos": alias_sugeridos,
        }

    except Exception as e:
        return {"ok": False, "detalle": f"Error al leer el archivo: {str(e)}"}
