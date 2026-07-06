"""
Módulo  : pipeline_service.py
Carpeta : epidemeologia/services/
Qué hace: Orquesta el pipeline completo de análisis epidemiológico en un hilo en segundo plano.
          Los resultados se persisten en JSON para sobrevivir reinicios del servidor.
Usado en: pipeline_controller.py, reportes_controller.py
"""
import json
import threading
import pandas as pd
import numpy as np
from datetime import datetime
from configs.settings import (
    RUTA_OPERATIVA, RUTA_SISCEP, RUTA_PIPELINE_ESTADO,
    RUTA_RESULTADOS_EPI, AÑO_ACTUAL,
)


class _NumpyEncoder(json.JSONEncoder):
    """Convierte tipos numpy a tipos Python nativos para serialización JSON."""
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

# ─── Claves de resultados ─────────────────────────────────────────────────────
_CLAVES = ("canal", "mapa", "alertas", "duplicados", "posibles_duplicados")

_estado = {
    "corriendo"      : False,
    "paso"           : "",
    "completado"     : False,
    "error"          : None,
    "ultimo_reporte" : None,
}

_resultados: dict = {c: None for c in _CLAVES}


# ─── Persistencia ─────────────────────────────────────────────────────────────

def _ruta(clave: str):
    return RUTA_RESULTADOS_EPI / f"{clave}.json"


def _guardar_resultados():
    RUTA_RESULTADOS_EPI.mkdir(parents=True, exist_ok=True)
    for clave, valor in _resultados.items():
        if valor is not None:
            _ruta(clave).write_text(
                json.dumps(valor, ensure_ascii=False, cls=_NumpyEncoder),
                encoding="utf-8",
            )


def _cargar_resultados():
    if not RUTA_RESULTADOS_EPI.exists():
        return
    for clave in _CLAVES:
        ruta = _ruta(clave)
        if ruta.exists():
            try:
                _resultados[clave] = json.loads(ruta.read_text(encoding="utf-8"))
            except Exception:
                pass


def _cargar_ultimo_reporte() -> str | None:
    try:
        return json.loads(RUTA_PIPELINE_ESTADO.read_text(encoding="utf-8")).get("ultimo_reporte")
    except Exception:
        return None


def _guardar_ultimo_reporte(fecha: str):
    try:
        RUTA_PIPELINE_ESTADO.parent.mkdir(parents=True, exist_ok=True)
        RUTA_PIPELINE_ESTADO.write_text(json.dumps({"ultimo_reporte": fecha}), encoding="utf-8")
    except Exception:
        pass


# ─── Inicialización al arrancar ───────────────────────────────────────────────
_cargar_resultados()
_estado["ultimo_reporte"] = _cargar_ultimo_reporte()
if any(_resultados[c] is not None for c in _CLAVES):
    _estado["completado"] = True
    _estado["paso"]       = "Pipeline completado exitosamente"


# ─── API pública ──────────────────────────────────────────────────────────────

def get_estado() -> dict:
    return {
        **_estado,
        "archivos": {
            "operativa": RUTA_OPERATIVA.exists(),
            "siscep"   : RUTA_SISCEP.exists(),
        },
    }


def get_resultado(clave: str):
    return _resultados.get(clave)


def iniciar_pipeline():
    _estado.update({
        "corriendo": True, "completado": False,
        "error": None, "paso": "Iniciando...",
    })
    threading.Thread(target=_ejecutar, daemon=True).start()


# ─── Pipeline ─────────────────────────────────────────────────────────────────

def _paso(texto: str):
    _estado["paso"] = texto
    print(f"[pipeline] {texto}")


def _ejecutar():
    try:
        from epidemeologia.modulos.depuracion          import depurar_base
        from epidemeologia.modulos.duplicados           import detectar_duplicados
        from epidemeologia.services.canal_service       import procesar_canal
        from epidemeologia.services.clustering_service  import procesar_clustering
        from epidemeologia.services.mapa_service        import procesar_mapa
        from epidemeologia.services.alertas_service     import procesar_alertas

        _paso("Depurando base operativa...")
        df = depurar_base(str(RUTA_OPERATIVA), str(RUTA_SISCEP))

        _paso("Detectando duplicados...")
        df_pre_dedup = df.copy()
        df, eliminados, posibles = detectar_duplicados(df)

        _COLS_PACIENTE = [
            'VEC_ID', 'IDE_NOM', 'IDE_APE_PAT', 'IDE_APE_MAT', 'CURP',
            'DES_UNI_MED_NOTIF',
            'FEC_INI_SIGNOS_SINT', 'FEC_NOTIF_EDO',
            'DES_DIAG_PROBABLE', 'DES_DIAG_FINAL',
            'MUESTRA_LABORATORIO', 'ESTATUS_SISCEP', 'CLASIFICACION_FINAL',
        ]
        cols_disp = [c for c in _COLS_PACIENTE if c in df_pre_dedup.columns]

        import json as _json
        if eliminados:
            df_elim = pd.DataFrame(eliminados)
            df_info = df_pre_dedup[cols_disp].copy()
            df_info['VEC_ID']            = df_info['VEC_ID'].astype(str)
            df_elim['VEC_ID_ELIMINADO']  = df_elim['VEC_ID_ELIMINADO'].astype(str)
            df_elim['VEC_ID_CONSERVADO'] = df_elim['VEC_ID_CONSERVADO'].astype(str)

            df_rechazados = df_info.merge(
                df_elim[['VEC_ID_ELIMINADO', 'VEC_ID_CONSERVADO', 'METODO']],
                left_on='VEC_ID', right_on='VEC_ID_ELIMINADO', how='inner'
            ).drop(columns=['VEC_ID_ELIMINADO'])

            _resultados["duplicados"] = _json.loads(
                df_rechazados.to_json(orient='records', date_format='iso', force_ascii=False)
            )
        else:
            _resultados["duplicados"] = []

        _resultados["posibles_duplicados"] = posibles

        _paso("Calculando canal endémico...")
        _resultados["canal"] = procesar_canal(df, AÑO_ACTUAL)

        _paso("Generando alertas SisCep...")
        _resultados["alertas"] = procesar_alertas(df, AÑO_ACTUAL)

        _paso("Ejecutando clustering geoespacial...")
        clust = procesar_clustering(df)
        _resultados["mapa"] = {
            "situacion"  : procesar_mapa(clust, "situacion",    AÑO_ACTUAL),
            "confirmados": procesar_mapa(clust, "confirmados",  AÑO_ACTUAL),
        }

        # ── Persistir en disco ────────────────────────────────────────────────
        _paso("Guardando resultados...")
        _guardar_resultados()

        fecha = datetime.now().strftime("%d/%m/%Y %I:%M %p")
        _guardar_ultimo_reporte(fecha)
        _estado.update({
            "corriendo"      : False,
            "completado"     : True,
            "paso"           : "Pipeline completado exitosamente",
            "ultimo_reporte" : fecha,
        })

    except Exception as exc:
        _estado.update({
            "corriendo": False, "completado": False,
            "error": str(exc), "paso": f"Error: {exc}",
        })
