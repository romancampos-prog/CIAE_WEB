"""
Validaciones de lo que manda el usuario en una solicitud: archivos subidos (peso, tipo y la
hoja que trae las columnas del mapeo) y la contraseña para sobrescribir datos. Si algo no
cuadra se levanta HTTPException con el codigo que corresponde.

Los Excel que se suben (Extractor e IAAS) los convierte el usuario con distintas versiones y
cada una nombra la hoja diferente ("Hoja1", "Sheet1", "reporte_defunciones"...): por eso la
hoja no se busca por nombre sino por su contenido. Las columnas siguen por letra, con el
nombreColumna del mapeo para confirmar. FTP no pasa por aqui: sus reportes llegan tal cual.
Usado en: services/*, epidemiologia (validarPeso_Archivo)
"""
import io

import pandas as pd
from fastapi import HTTPException
from openpyxl.utils import get_column_letter

from auth.services.auth_service import verificar_credenciales
from services.metodos_extraccion_excel import letra_a_numero

PESO_MAXIMO = 10 * 1024 * 1024  # 10 MB, para que un archivo no llene la RAM del servidor
_EXTENSIONES_EXCEL = (".xlsx", ".xls")


class HojaNoEncontrada(ValueError):
    """Ninguna hoja trae las columnas del mapeo; mensajes = lo que se le muestra al usuario, renglon por renglon."""

    def __init__(self, mensajes: list[str]):
        super().__init__("\n".join(mensajes))
        self.mensajes = mensajes


##--------------------------------------

def validarPeso_Archivo(contenido: bytes, pesoArchivo: int | None) -> bool:
    """True si el archivo pesa lo que el front declaro (archivo.size en JS) y no pasa del maximo."""
    return len(contenido) == pesoArchivo and pesoArchivo <= PESO_MAXIMO


##--------------------------------------

def validar_archivo_subido(contenido: bytes, peso_declarado: int | None, nombre_archivo: str | None = None, etiqueta: str | None = None) -> None:
    """
    Revisa un archivo subido: que sea Excel (solo si se da nombre_archivo; IAAS manda como
    nombre la unidad, no el del archivo) y que pese lo que el front dijo.
    """
    if nombre_archivo is not None and not nombre_archivo.endswith(_EXTENSIONES_EXCEL):
        raise HTTPException(400, f"{etiqueta}: solo se aceptan archivos Excel (.xlsx, .xls)" if etiqueta
                            else "Solo se aceptan archivos Excel (.xlsx, .xls)")
    if not validarPeso_Archivo(contenido, peso_declarado):
        raise HTTPException(413, f"{etiqueta}: archivo demasiado grande o tamaño inconsistente" if etiqueta
                            else "Archivo demasiado grande o tamaño inconsistente")


##--------------------------------------

def exigir_contrasena(usuario: str | None, password: str) -> None:
    """Sobrescribir datos ya guardados (regenerar, completar una unidad) pide otra vez la contraseña del usuario."""
    if not verificar_credenciales(usuario, password):
        raise HTTPException(401, "Contraseña incorrecta")


##--------------------------------------

def validar_columnas_esperadas(nombres_reales: list, esperadas: dict[str, str]) -> list[str]:
    """
    Compara los encabezados reales del Excel contra {letra: nombre esperado} (sin distinguir
    mayusculas); regresa un mensaje por columna que no cuadra.
    """
    encabezados = [str(nombre).strip().upper() for nombre in nombres_reales]

    def donde_quedo(esperado: str) -> str:
        # No se usa la columna encontrada: solo se le dice al usuario donde quedo para que revise el archivo.
        posiciones = [get_column_letter(i + 1) for i, nombre in enumerate(encabezados) if nombre == esperado.strip().upper()]
        return f" '{esperado}' está en la columna {', '.join(posiciones)}: parece que se recorrieron las columnas." if posiciones else ""

    errores = []
    for letra, esperado in esperadas.items():
        idx = letra_a_numero(letra)
        if idx >= len(nombres_reales):
            errores.append(f"Falta la columna '{letra}' (se esperaba '{esperado}').{donde_quedo(esperado)}")
            continue
        real = str(nombres_reales[idx]).strip()
        if real.upper() != esperado.strip().upper():
            errores.append(f"Columna '{letra}': dice '{real}' (se esperaba '{esperado}').{donde_quedo(esperado)}")
    return errores


##--------------------------------------

class LectorExcel:
    """
    Lee cada hoja del Excel subido UNA sola vez aunque varios indicadores la pidan
    (EH 03, DM 04 y MT 03 salen del mismo SUI-13 del mes).
    """

    def __init__(self, contenido_bytes: bytes):
        self._libro = pd.ExcelFile(io.BytesIO(contenido_bytes))
        self._hojas: dict[tuple[str, int], pd.DataFrame] = {}
        self._encabezados: dict[tuple[str, int], list] = {}


    ##--------------------------------------

    def _hoja(self, nombre: str, encabezado: int) -> pd.DataFrame:
        clave = (nombre, encabezado)
        if clave not in self._hojas:
            self._hojas[clave] = pd.read_excel(self._libro, sheet_name=nombre, header=encabezado - 1)
        return self._hojas[clave]


    ##--------------------------------------

    def _encabezado(self, nombre: str, encabezado: int) -> list:
        """Solo la fila del encabezado (no toda la hoja), para revisar rapido cada hoja."""
        clave = (nombre, encabezado)
        if clave not in self._encabezados:
            filas = pd.read_excel(self._libro, sheet_name=nombre, header=None, nrows=encabezado)
            self._encabezados[clave] = list(filas.iloc[encabezado - 1]) if len(filas) >= encabezado else []
        return self._encabezados[clave]


    ##--------------------------------------

    def hoja_con_columnas(self, esperadas: dict[str, str], encabezado: int = 1, nombres: list[str] | None = None) -> pd.DataFrame:
        """
        La primera hoja que trae, en cada letra de 'esperadas' ({letra: encabezado}), ese
        encabezado, y ademas las columnas de 'nombres' en cualquier posicion (las que el codigo
        usa por nombre, ej. la de unidad). Si ninguna cuadra, el error explica la que mas se parecio.
        """
        if not esperadas and not nombres:
            raise HojaNoEncontrada(["El mapeo no dice qué columnas trae el archivo: no se puede saber qué hoja leer."])
        revisadas = []
        for nombre in self._libro.sheet_names:
            reales = self._encabezado(nombre, encabezado)
            reales_upper = {str(r).strip().upper() for r in reales}
            errores = validar_columnas_esperadas(reales, esperadas)
            errores += [f"No trae la columna '{n}'." for n in (nombres or []) if n.strip().upper() not in reales_upper]
            if not errores:
                return self._hoja(nombre, encabezado)
            revisadas.append((nombre, errores))

        hoja, errores = min(revisadas, key=lambda r: len(r[1]))
        raise HojaNoEncontrada([
            "Ninguna hoja del archivo trae las columnas que pide el indicador; revisa que sea el archivo correcto. "
            f"La que más se parece es '{hoja}':",
            *errores,
        ])


##--------------------------------------

def numeros_escritos_como_texto(df: pd.DataFrame, detalle: dict) -> pd.DataFrame:
    """
    Los filtros RANGO solo comparan celdas numericas: si al convertir el archivo un numero
    quedo como texto ("36"), la fila no contaba y el indicador daba 0 sin avisar. Se
    convierten a numero las columnas que usa un RANGO, sobre una copia porque la hoja se
    comparte con otros indicadores que pueden leer esa columna como texto.
    """
    letras = [l for l, c in detalle.get("filtroColumna", {}).items() if isinstance(c, dict) and c.get("tipo") == "RANGO"]
    letras += [l for alt in detalle.get("filtroAlternativas", []) for l, c in alt.items() if isinstance(c, dict) and c.get("tipo") == "RANGO"]
    letras += [l for g in detalle.get("filtroGrupoColumnas", []) if g.get("tipo") == "RANGO" for l in g["columnas"]]

    copia = None
    for letra in dict.fromkeys(letras):
        idx = letra_a_numero(letra)
        if idx >= df.shape[1]:
            continue   # la falta de columna ya la reporta el motor
        columna = df.iloc[:, idx]
        if not columna.map(lambda v: isinstance(v, str)).any():
            continue
        numeros = pd.to_numeric(columna, errors="coerce")
        if numeros.notna().sum() == 0:
            raise ValueError(f"La columna {letra} ('{df.columns[idx]}') no trae números: revisa cómo se convirtió el archivo a Excel.")
        copia = df.copy() if copia is None else copia
        copia[copia.columns[idx]] = numeros
    return df if copia is None else copia
