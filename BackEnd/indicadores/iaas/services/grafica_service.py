"""
Arma el dataset que consume la gráfica IAAS del front: por indicador y unidad,
la serie mensual con su acumulado (Ene→mes) ya resuelto con el semáforo.
Cada indicador se cachea por separado (mismo criterio que FTP) porque cada
uno vive en su propio archivo IAAS_0N.json y se puede regenerar solo —
así, si se regenera un indicador, no se invalida el caché de los otros 5.
Usado en: iaas/controllers/reportes_controller.py
"""
from iaas.config import RUTA_DATA_IAAS
from iaas.services.calculos_iaas import UNIDADES_UCI, _alias_hgsz, _acumular_unidad
from iaas.services.extraccion_service import _semaforo_general, _semaforo_IAAS01
from iaas.services.datos_json_service import leer_indicador_anio
from shared.cache_service import obtener_o_calcular

# HGS/HGSMF y HGSZ/HGSZMF son la misma unidad — el dato crudo a veces trae el alias.
# Mismo criterio que ya usa el Excel (_dato_unidad en generar_iaas.py), aquí solo se
# arma una vez el mapa alias→nombre canónico para no repetir la búsqueda cada vez.
_ALIAS_A_CANONICO_IAAS = {
    alias: u for u in UNIDADES_UCI
    for alias in [_alias_hgsz(u)] if alias
}

NOMBRE_A_NUM_IAAS = {
    "ENERO": "01", "FEBRERO": "02", "MARZO": "03", "ABRIL": "04",
    "MAYO": "05", "JUNIO": "06", "JULIO": "07", "AGOSTO": "08",
    "SEPTIEMBRE": "09", "OCTUBRE": "10", "NOVIEMBRE": "11", "DICIEMBRE": "12",
}

_CACHE_IAAS: dict = {}


def _calcular_indicador_iaas(anio: str, ind_n: int) -> dict:
    """Calcula un solo indicador IAAS: {"ind_data": {...}, "meses": {...}}."""
    ind_key = f"IAAS 0{ind_n}"
    data    = leer_indicador_anio(anio, ind_n)
    if not data:
        return {"ind_data": {}, "meses": set()}

    # all_months: {mes_num: {unidad: {"numerador":, "denominador":}}} -- mismo formato
    # que usa _acumular_unidad para el Excel, aquí se reutiliza para el acumulado del
    # front, así el criterio de "cuánto llevamos sumado" es idéntico en los dos lugares.
    all_months: dict = {}
    ind_data: dict   = {}
    meses_set: set   = set()
    for mes_nombre, mes_data in data.get("MESES", {}).items():
        mes_str = NOMBRE_A_NUM_IAAS.get(mes_nombre.upper())
        if not mes_str:
            continue
        mes_num = int(mes_str)
        for unidad, vals in mes_data.get("DATOS", {}).items():
            unidad = _ALIAS_A_CANONICO_IAAS.get(unidad, unidad)
            n_v   = vals.get("NUMERADOR")
            d_v   = vals.get("DENOMINADOR")
            t_v   = vals.get("TASA")
            color = (vals.get("COLOR") or "Bajo").capitalize()
            all_months.setdefault(mes_num, {})[unidad] = {"numerador": n_v, "denominador": d_v}
            if n_v is not None or t_v is not None or d_v is not None:
                meses_set.add(mes_str)
                ind_data.setdefault(unidad, []).append({
                    "mes":         mes_str,
                    "tasa":        t_v,
                    "numerador":   n_v,
                    "denominador": d_v,
                    "color":       color,
                })

    # Acumulado (Ene→ese mes) por unidad y mes -- calculado aquí, una sola vez, con el
    # mismo semáforo que ya corregimos (_semaforo_general/_semaforo_IAAS01). El frontend
    # ya no debe sumar ni decidir colores, solo mostrar lo que manda el backend.
    for unidad, registros in ind_data.items():
        for reg in registros:
            mes_num = int(reg["mes"])
            acum_num, acum_den, tiene = _acumular_unidad(all_months, unidad, mes_num)
            if not tiene:
                reg.update(numerador_acum=None, denominador_acum=None, tasa_acum=None, color_acum="Gris")
                continue
            raw = {unidad: {"numerador": acum_num, "denominador": acum_den}}
            calc = (_semaforo_IAAS01(raw) if ind_key == "IAAS 01" else _semaforo_general(raw, ind_key))[unidad]
            reg.update(
                numerador_acum=acum_num, denominador_acum=acum_den,
                tasa_acum=calc["tasa"], color_acum=calc["color"],
            )

    return {"ind_data": ind_data, "meses": meses_set}


def calcular_datos_grafica_iaas(anio: str) -> dict:
    """Devuelve {"unidades": [...], "meses_con_datos": [...], "datos": {...}}."""
    datos: dict = {}
    meses_set: set = set()

    for ind_n in range(1, 7):
        ind_key = f"IAAS 0{ind_n}"
        archivo = RUTA_DATA_IAAS / str(anio) / f"IAAS_0{ind_n}.json"
        resultado = obtener_o_calcular(
            _CACHE_IAAS, (ind_key, anio), [archivo],
            lambda anio=anio, ind_n=ind_n: _calcular_indicador_iaas(anio, ind_n),
        )
        datos[ind_key] = resultado["ind_data"]
        meses_set |= resultado["meses"]

    return {
        "unidades":        list(UNIDADES_UCI),
        "meses_con_datos": sorted(meses_set),
        "datos":           datos,
    }