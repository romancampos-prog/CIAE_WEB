"""
Módulo  : poblacion_service.py
Carpeta : indicadores_FTP/services/
Qué hace: Procesa el Excel de población nacional, filtra Guanajuato y guarda POBLACION.json.
          Usa MAPEO_POBLACION.json para ubicar columnas por nombre en vez de posición fija,
          ya que la estructura del Excel (INEGI) puede correrse de un año a otro.
          Soporta "alias": mapeos de nombre-Excel → nombre-sistema para tolerar diferencias
          de nomenclatura entre el Excel del IMSS y los nombres canónicos del sistema.
Usado en: indicadores_FTP/controllers/poblacionFTP.py
"""
import io
import re
import json
import pandas as pd
from configs.unidades import NOMBREUNIDADESARCHIVO
from configs.settings import RUTA_POBLACION, RUTA_MAPEO_POBLACION

DELEGACION_FILTRO = "Guanajuato"


def _cargar_mapeo() -> dict:
    with open(RUTA_MAPEO_POBLACION, "r", encoding="utf-8") as f:
        return json.load(f)


def _buscar_columna(fila, texto: str):
    """Devuelve la posición (índice entero) de la primera celda de `fila` que coincide con `texto`."""
    for idx, val in enumerate(fila):
        if str(val).strip() == texto:
            return idx
    return None


def _cel_str(v):
    """Convierte valores de pandas a string limpio: '1.0' → '1', '2.0' → '2', etc."""
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
    """Extrae el número de unidad sin ceros al inicio (ej: 'UMF 05 COMONFORT' → '5')."""
    m = re.search(r'\b0*(\d+)\b', nombre)
    return m.group(1) if m else None


def _sugerir_alias(no_encontradas: list, extras: list) -> dict:
    """
    Propone emparejamientos extras(Excel) → sistema emparejando por número de unidad.
    Resultado: {excel_name_lower: sistema_name}  — listo para pegar en MAPEO_POBLACION.json
    """
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
        mapeo = _cargar_mapeo()
        buffer = io.BytesIO(contenido_bytes)

        # Lectura cruda (sin header) para poder ubicar las filas de grupo y de encabezados por nombre.
        crudo = pd.read_excel(buffer, sheet_name=mapeo["hoja"], header=None, usecols="A:EJ")

        fila_grupos      = crudo.iloc[mapeo["fila_grupos"] - 1]
        fila_encabezados = crudo.iloc[mapeo["fila_encabezados"] - 1]
        datos            = crudo.iloc[mapeo["fila_encabezados"]:]

        # Buscar en fila_grupos (row 11) porque "Delegación" y "Unidad" son celdas
        # fusionadas verticalmente: pandas solo pone el valor en la celda superior.
        col_delegacion = _buscar_columna(fila_grupos, mapeo["columnas_unicas"]["delegacion"])
        col_unidad     = _buscar_columna(fila_grupos, mapeo["columnas_unicas"]["unidad"])

        if col_delegacion is None or col_unidad is None:
            faltante = mapeo["columnas_unicas"]["delegacion"] if col_delegacion is None else mapeo["columnas_unicas"]["unidad"]
            return {"ok": False, "detalle": f"No se encontró la columna '{faltante}' en el Excel. La estructura pudo haber cambiado."}

        encabezados_edad = mapeo["encabezados_edad"]
        n_cols = len(encabezados_edad)

        bloques = {}
        for grupo, info in mapeo["bloques_edad"].items():
            etiqueta = info["etiqueta_grupo"]
            inicio   = _buscar_columna(fila_grupos, etiqueta)
            if inicio is None:
                return {"ok": False, "detalle": f"No se encontró el bloque '{etiqueta}' en el Excel. La estructura pudo haber cambiado."}

            fin    = inicio + n_cols - 1
            reales = [_cel_str(v) for v in fila_encabezados.iloc[inicio:fin + 1]]
            if reales != encabezados_edad:
                return {"ok": False, "detalle": f"Las columnas del bloque '{etiqueta}' no coinciden con lo esperado. La estructura del Excel pudo haber cambiado."}

            bloques[grupo] = (inicio, fin)

        df_gto = datos[
            datos[col_delegacion].astype(str).str.strip() == DELEGACION_FILTRO
        ].copy()

        if df_gto.empty:
            return {
                "ok": False,
                "detalle": f"No hay filas con '{DELEGACION_FILTRO}' en la columna '{mapeo['columnas_unicas']['delegacion']}'."
            }

        resultado = {}
        errores_datos = []  # celdas vacías/sin valor: error humano de captura en el Excel

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
                        errores_datos.append({
                            "unidad": unidad,
                            "grupo": grupo,
                            "columna": encabezados_edad[i],
                        })
                resultado[unidad][grupo] = valores

        # ── Cargar configuración de alias ─────────────────────────────────────────
        # alias: {"nombre_en_excel_lowercase": "NOMBRE_EN_SISTEMA" o null para ignorar}
        alias_raw = mapeo.get("alias", {})
        alias_excel_a_sistema  = {k.lower(): v for k, v in alias_raw.items() if v is not None}
        alias_ignorar          = {k.lower() for k, v in alias_raw.items() if v is None}
        # Lookup inverso: sistema_lower → excel_lower  (para encontrar el dato del Excel por nombre de sistema)
        alias_sistema_a_excel  = {v.lower(): k for k, v in alias_excel_a_sistema.items()}

        # ── Empatar Excel con NOMBREUNIDADESARCHIVO ───────────────────────────────
        resultado_lower = {k.lower(): k for k in resultado}
        resultado_ordenado = {}
        no_encontradas = []

        for nombre_ref in NOMBREUNIDADESARCHIVO:
            nombre_ref_lower = nombre_ref.lower()

            # 1. Coincidencia directa (insensible a mayúsculas)
            clave_excel = resultado_lower.get(nombre_ref_lower)
            if clave_excel is not None:
                resultado_ordenado[nombre_ref] = resultado[clave_excel]
                continue

            # 2. Alias: hay una entrada que dice "el Excel usa X para referirse a este nombre"
            excel_lower = alias_sistema_a_excel.get(nombre_ref_lower)
            if excel_lower:
                clave_excel = resultado_lower.get(excel_lower)
                if clave_excel is not None:
                    resultado_ordenado[nombre_ref] = resultado[clave_excel]
                    continue

            no_encontradas.append(nombre_ref)

        # Extras: están en el Excel pero no coinciden con ningún nombre del sistema
        sistema_lower_set = {n.lower() for n in NOMBREUNIDADESARCHIVO}
        extras = []
        for k in resultado:
            k_lower = k.lower()

            if k_lower in sistema_lower_set:
                continue   # ya fue manejado en el loop principal
            if k_lower in alias_ignorar:
                continue   # explícitamente ignorado (alias → null)

            alias_nombre = alias_excel_a_sistema.get(k_lower)
            if alias_nombre and alias_nombre.lower() not in sistema_lower_set:
                # Alias que apunta a un nombre fuera de NOMBREUNIDADESARCHIVO (ej. "TOTAL OOAD")
                # → se guarda con ese nombre canónico pero SIN mostrar advertencia
                resultado_ordenado[alias_nombre] = resultado[k]
            elif not alias_nombre:
                # Realmente no reconocido → advertencia
                extras.append(k)
                resultado_ordenado[k] = resultado[k]
            # else: alias que apunta a un nombre de sistema → ya fue procesado en el loop principal

        # Auto-sugerir alias para los que quedaron sin empatar (por número de unidad)
        alias_sugeridos = _sugerir_alias(no_encontradas, extras) if (no_encontradas and extras) else {}

        if no_encontradas:
            print(f"[ADVERTENCIA] En NOMBREUNIDADESARCHIVO pero NO en Excel: {no_encontradas}")
        if extras:
            print(f"[ADVERTENCIA] En Excel pero NO en NOMBREUNIDADESARCHIVO: {extras}")
        if alias_sugeridos:
            print(f"[SUGERENCIA] Alias detectados automáticamente: {alias_sugeridos}")
        if errores_datos:
            print(f"[ADVERTENCIA] {len(errores_datos)} celda(s) vacía(s) en el Excel: {errores_datos}")

        RUTA_POBLACION.parent.mkdir(parents=True, exist_ok=True)
        with open(RUTA_POBLACION, "w", encoding="utf-8") as f:
            json.dump(resultado_ordenado, f, indent=2, ensure_ascii=False)

        return {
            "ok": True,
            "detalle": f"Procesadas {len(resultado_ordenado)} unidades de {DELEGACION_FILTRO}.",
            "nombre": nombre_archivo,
            "unidades": len(resultado_ordenado),
            "no_encontradas": no_encontradas,
            "extras": extras,
            "celdas_vacias": len(errores_datos),
            "errores_datos": errores_datos,
            "alias_sugeridos": alias_sugeridos,
        }

    except Exception as e:
        return {"ok": False, "detalle": f"Error al leer el archivo: {str(e)}"}
