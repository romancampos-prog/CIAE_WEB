"""
Estado del pipeline (corriendo, paso, error, ultimo reporte) y sus resultados en memoria. Al
arrancar el servidor se cargan los resultados guardados en disco.
Usado en: Controller/pipeline_Controller.py, Controller/reportes_Controller.py, services/dengue/pipeline/*
"""
from epidemiologia.config import RUTA_OPERATIVA, RUTA_SISCEP
from epidemiologia.datos.dengue.resultados_pipeline_Datos import cargar_resultados, cargar_ultimo_reporte

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


def estado_del_pipeline() -> dict:
    return {
        **ESTADO,
        "archivos": {
            "operativa": RUTA_OPERATIVA.exists(),
            "siscep"   : RUTA_SISCEP.exists(),
        },
    }


##--------------------------------------

def resultado_guardado(clave: str):
    return RESULTADOS.get(clave)


##--------------------------------------

def avisar_paso(texto: str):
    ESTADO["paso"] = texto
    print(f"[pipeline] {texto}")
