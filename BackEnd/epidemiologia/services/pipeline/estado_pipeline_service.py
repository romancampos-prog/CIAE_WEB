"""
Estado del pipeline (corriendo, paso, error, ultimo reporte) y sus resultados en memoria. Al
arrancar el servidor se cargan los resultados guardados en disco.
Usado en: controllers/pipeline_controller.py, controllers/reportes_controller.py, services/pipeline/*
"""
from epidemiologia.config import RUTA_OPERATIVA, RUTA_SISCEP
from epidemiologia.datos.resultados_pipeline_datos import cargar_resultados, cargar_ultimo_reporte

ESTADO = {
    "corriendo"      : False,
    "paso"           : "",
    "completado"     : False,
    "error"          : None,
    "ultimo_reporte" : None,
}

# Al arrancar: lo que ya estaba guardado en disco
RESULTADOS: dict = cargar_resultados()
ESTADO["ultimo_reporte"] = cargar_ultimo_reporte()
if any(valor is not None for valor in RESULTADOS.values()):
    ESTADO["completado"] = True
    ESTADO["paso"]       = "Pipeline completado exitosamente"


def get_estado() -> dict:
    return {
        **ESTADO,
        "archivos": {
            "operativa": RUTA_OPERATIVA.exists(),
            "siscep"   : RUTA_SISCEP.exists(),
        },
    }


##--------------------------------------

def get_resultado(clave: str):
    return RESULTADOS.get(clave)


##--------------------------------------

def avisar_paso(texto: str):
    ESTADO["paso"] = texto
    print(f"[pipeline] {texto}")
