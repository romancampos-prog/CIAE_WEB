"""
Poblacion InfoSalud (BD_CIAE/POBLACION_INFOSALUD/POBLACION_{año}.json): carga del Excel
nacional (se filtra Guanajuato) y lectura por unidad para el denominador de los indicadores
que dependen de ella (fuente "poblacionInfoSalud" en el mapeo). Compartido entre FTP y
Extractor (EH 03, DM 04 la usan en su corte semestral).
Usado en: Controller/ftp_Controller.py, services/ftp/*, services/extractor/corte_extractor_Services.py
"""
import datetime
import io
import json
import re
from pathlib import Path

import pandas as pd
from fastapi import HTTPException

from configs.settings import DATA_POBLACION_INFOSALUD
from schemas.model.generacion_Model import DatosExtraidosUnidad, ResultadoCargaPoblacion
from services.calculo_indicador_Services import UMBRAL_SUBE_REDONDEO, evaluar_lado
from shared.auditoria_service import registrar
from shared.MESES import MESES_ESTANDAR
from shared.UNIDADES import NOMBREUNIDADESARCHIVO
from shared.validarArchivo_service import validar_archivo_subido

DELEGACION_FILTRO = "Guanajuato"
RUTA_MAPEO_POBLACION = Path(__file__).parent.parent / "mapeo" / "POBLACION.json"

_REGEX_MES_ANIO_TITULO = re.compile(r'(' + '|'.join(MESES_ESTANDAR) + r')\s+(\d{4})', re.IGNORECASE)


def ruta_poblacion(anio: str | int | None = None) -> Path:
    """POBLACION_{anio}.json; si no se especifica año, el año en curso."""
    return DATA_POBLACION_INFOSALUD / f"POBLACION_{anio or datetime.date.today().year}.json"


##--------------------------------------

def _leer_poblacion(anio: str | int | None) -> dict:
    ruta = ruta_poblacion(anio)
    if not ruta.exists():
        return {}
    with open(ruta, encoding="utf-8") as f:
        return json.load(f)


##--------------------------------------

def leer_periodo_poblacion(anio: str | int | None = None) -> tuple[str | None, int | None]:
    """Mes/año detectado del titulo del reporte vigente, o (None, None) si no hay o no se pudo detectar al subirla."""
    datos = _leer_poblacion(anio)
    return datos.get("MES_DETECTADO"), datos.get("ANIO_DETECTADO")


##--------------------------------------

def texto_poblacion_vigente(anio: str | int | None) -> str | None:
    """"Mes Año" de la poblacion vigente, para dejar registrado con que poblacion se calculo cada mes."""
    mes, anio_detectado = leer_periodo_poblacion(anio)
    return f"{mes} {anio_detectado}" if mes and anio_detectado else None


##--------------------------------------

def archivo_poblacion_actual(anio: str | None) -> dict:
    """Nombre (sin extension) del ultimo Excel de poblacion subido y el mes/año que se detecto de el."""
    datos = _leer_poblacion(anio)
    return {
        "nombre_sin_ext": datos.get("ARCHIVO") or None,
        "mes_detectado":  datos.get("MES_DETECTADO"),
        "anio_detectado": datos.get("ANIO_DETECTADO"),
    }


##--------------------------------------

def extraer_poblacion(sexo: dict[str, list[str]], ano: str, extraidos: dict[str, DatosExtraidosUnidad]) -> list[tuple[str, str, str]]:
    """
    Llena extraidos[unidad].denominador[grupo] con los valores por columna de POBLACION_{año}.json.
    Regresa los errores como (unidad, grupo, mensaje) para quien los quiera registrar (FTP).
    """
    ruta = ruta_poblacion(ano)
    if not ruta.exists():
        for datos in extraidos.values():
            for grupo in sexo:
                datos.denominador[grupo] = None
        return [(unidad, "poblacion", f"No existe {ruta}") for unidad in extraidos]

    poblacion = _leer_poblacion(ano).get("POBLACION", {})
    errores = []
    for unidad, datos in extraidos.items():
        for grupo, columnas in sexo.items():
            try:
                datos.denominador[grupo] = [float(poblacion[unidad][grupo][columna]) for columna in columnas]
            except KeyError as error:
                errores.append((unidad, grupo, f"No existe {error} en POBLACION"))
                datos.denominador[grupo] = None
    return errores


##--------------------------------------

def denominador_de_poblacion(sexo: dict[str, list[str]], formula_denominador: str, ano: str | int) -> dict[str, int | None]:
    """{unidad: denominador} de las 46 unidades, con la formula del mapeo sobre la poblacion del año."""
    extraidos = {unidad: DatosExtraidosUnidad() for unidad in NOMBREUNIDADESARCHIVO}
    extraer_poblacion(sexo, str(ano), extraidos)
    denominadores = {}
    for unidad, datos in extraidos.items():
        try:
            denominadores[unidad] = evaluar_lado(formula_denominador, datos.denominador, UMBRAL_SUBE_REDONDEO)
        except Exception as error:
            print(f"[Poblacion] Error evaluando el denominador de {unidad}: {error}")
            denominadores[unidad] = None
    return denominadores


##--------------------------------------

def subir_poblacion(usuario: str | None, nombre_archivo: str, contenido: bytes, peso: int, anio: str | None) -> tuple[str, dict]:
    """Endpoint de subir la poblacion: (mensaje, datos) para la respuesta."""
    # 1. Validar que sea Excel y que pese lo que dijo el front
    validar_archivo_subido(contenido, peso, nombre_archivo)
    # 2. Leer el Excel nacional y guardar lo de Guanajuato
    resultado = procesar_archivo_poblacion(contenido, nombre_archivo, anio)
    if not resultado["ok"]:
        raise HTTPException(status_code=422, detail=resultado["detalle"])
    # 3. Auditar
    registrar("SUBIDA_ARCHIVO", usuario=usuario, detalle=f"archivo=poblacion({nombre_archivo}) bytes={len(contenido)}")
    return resultado["detalle"], ResultadoCargaPoblacion(**resultado).model_dump()


##--------------------------------------

def _cargar_mapeo() -> dict:
    with open(RUTA_MAPEO_POBLACION, "r", encoding="utf-8") as f:
        return json.load(f)


##--------------------------------------

def _buscar_columna(fila, texto: str):
    for idx, val in enumerate(fila):
        if str(val).strip() == texto:
            return idx
    return None


##--------------------------------------

def _cel_str(v):
    s = str(v).strip()
    return s[:-2] if (s.endswith('.0') and s[:-2].lstrip('-').isdigit()) else s


##--------------------------------------

def _limpiar(v):
    if v is None:
        return None
    if isinstance(v, float) and (v != v or v in (float('inf'), float('-inf'))):
        return None
    s = str(v).strip()
    return None if s in ('', 'nan', 'NaN', 'None') else v


##--------------------------------------

def _extraer_numero(nombre: str):
    m = re.search(r'\b0*(\d+)\b', nombre)
    return m.group(1) if m else None


##--------------------------------------

def _detectar_mes_anio_titulo(fila_titulo) -> tuple[str | None, int | None]:
    """
    Busca "Mes AAAA" en el texto de la fila de titulo del reporte (ej. fila 7:
    "Población Adscrita..., Julio 2026."). Si no aparece -- el reporte cambió de
    formato o de fila -- regresa (None, None) para que el llamador avise al
    usuario en vez de asumir un mes/año incorrecto.
    """
    for valor in fila_titulo:
        if not valor:
            continue
        coincidencia = _REGEX_MES_ANIO_TITULO.search(str(valor))
        if coincidencia:
            return coincidencia.group(1).capitalize(), int(coincidencia.group(2))
    return None, None


##--------------------------------------

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


##--------------------------------------

def procesar_archivo_poblacion(contenido_bytes: bytes, nombre_archivo: str, anio: str | int | None = None) -> dict:
    try:
        mapeo  = _cargar_mapeo()
        buffer = io.BytesIO(contenido_bytes)

        crudo = pd.read_excel(buffer, sheet_name=mapeo["hoja"], header=None, usecols="A:EJ")

        mes_detectado = anio_detectado = None
        advertencia_titulo = None
        fila_titulo_num = mapeo.get("fila_titulo")
        if fila_titulo_num:
            try:
                mes_detectado, anio_detectado = _detectar_mes_anio_titulo(crudo.iloc[fila_titulo_num - 1])
            except IndexError:
                pass
            if mes_detectado is None:
                advertencia_titulo = (
                    f"No se pudo detectar el mes y año del reporte en la fila {fila_titulo_num} del Excel -- "
                    "verifica manualmente que el archivo sea del período correcto."
                )

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

        nombre_sin_ext = re.sub(r"\.(xlsx|xls)$", "", nombre_archivo, flags=re.IGNORECASE)

        ruta = ruta_poblacion(anio)
        ruta.parent.mkdir(parents=True, exist_ok=True)
        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "ARCHIVO":        nombre_sin_ext,
                    "MES_DETECTADO":  mes_detectado,
                    "ANIO_DETECTADO": anio_detectado,
                    "POBLACION":      resultado_ordenado,
                },
                f, indent=2, ensure_ascii=False,
            )

        return {
            "ok":                  True,
            "detalle":             f"Procesadas {len(resultado_ordenado)} unidades de {DELEGACION_FILTRO}.",
            "nombre":              nombre_archivo,
            "nombre_sin_ext":      nombre_sin_ext,
            "unidades":            len(resultado_ordenado),
            "no_encontradas":      no_encontradas,
            "extras":              extras,
            "celdas_vacias":       len(errores_datos),
            "errores_datos":       errores_datos,
            "alias_sugeridos":     alias_sugeridos,
            "mes_detectado":       mes_detectado,
            "anio_detectado":      anio_detectado,
            "advertencia_titulo":  advertencia_titulo,
        }

    except Exception as e:
        return {"ok": False, "detalle": f"Error al leer el archivo: {str(e)}"}
