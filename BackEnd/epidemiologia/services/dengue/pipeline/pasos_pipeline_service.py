"""
Los pasos del pipeline de dengue, en orden: depurar -> duplicados -> canal endemico -> alertas
SisCep -> clustering -> mapas -> guardar. Corre en un hilo; el avance queda en ESTADO.
Los servicios de cada paso se importan aqui adentro: cargan pandas/sklearn/geopandas y asi no
pesan al arrancar el servidor.
Usado en: services/dengue/pipeline/iniciar_pipeline_service.py
"""
from datetime import datetime

from epidemiologia.config import AÑO_ACTUAL, RUTA_OPERATIVA, RUTA_SISCEP
from epidemiologia.datos.dengue.resultados_pipeline_datos import guardar_resultados, guardar_ultimo_reporte
from epidemiologia.services.dengue.pipeline.estado_pipeline_service import ESTADO, RESULTADOS, avisar_paso


def ejecutar_pasos():
    try:
        from epidemiologia.services.dengue.alertas_service    import procesar_alertas
        from epidemiologia.services.dengue.canal_service      import procesar_canal
        from epidemiologia.services.dengue.clustering_service import procesar_clustering
        from epidemiologia.services.dengue.depuracion_service import depurar_base
        from epidemiologia.services.dengue.duplicados_service import procesar_duplicados
        from epidemiologia.services.dengue.mapa_service       import procesar_mapa

        # 1. Depurar la base operativa (con el cruce de SisCep)
        avisar_paso("Depurando base operativa...")
        df = depurar_base(str(RUTA_OPERATIVA), str(RUTA_SISCEP))

        # 2. Duplicados
        avisar_paso("Detectando duplicados...")
        df, RESULTADOS["duplicados"], RESULTADOS["posibles_duplicados"] = procesar_duplicados(df)

        # 3. Canal endemico
        avisar_paso("Calculando canal endémico...")
        RESULTADOS["canal"] = procesar_canal(df, AÑO_ACTUAL)

        # 4. Alertas SisCep
        avisar_paso("Generando alertas SisCep...")
        RESULTADOS["alertas"] = procesar_alertas(df, AÑO_ACTUAL)

        # 5. Clustering y mapas
        avisar_paso("Ejecutando clustering geoespacial...")
        clust = procesar_clustering(df)
        RESULTADOS["mapa"] = {
            "situacion"  : procesar_mapa(clust, "situacion",    AÑO_ACTUAL),
            "confirmados": procesar_mapa(clust, "confirmados",  AÑO_ACTUAL),
        }

        # 6. Guardar en disco y marcar terminado
        avisar_paso("Guardando resultados...")
        guardar_resultados(RESULTADOS)

        fecha = datetime.now().strftime("%d/%m/%Y %I:%M %p")
        guardar_ultimo_reporte(fecha)
        ESTADO.update({
            "corriendo"      : False,
            "completado"     : True,
            "paso"           : "Pipeline completado exitosamente",
            "ultimo_reporte" : fecha,
        })

    except Exception as exc:
        ESTADO.update({
            "corriendo": False, "completado": False,
            "error": str(exc), "paso": f"Error: {exc}",
        })
