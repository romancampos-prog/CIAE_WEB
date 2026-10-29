"""
Los pasos del pipeline de dengue, en orden: depurar -> duplicados -> canal endemico -> alertas
SisCep -> clustering -> mapas -> guardar. Corre en un hilo; el avance queda en ESTADO.
Los servicios de cada paso se importan aqui adentro: cargan pandas/sklearn/geopandas y asi no
pesan al arrancar el servidor.
Usado en: services/dengue/pipeline/iniciar_pipeline_Services.py
"""
from datetime import datetime

from epidemiologia.config import RUTA_OPERATIVA, RUTA_SISCEP
from epidemiologia.datos.dengue.resultados_pipeline_Datos import guardar_resultados, guardar_ultimo_reporte
from epidemiologia.services.dengue.pipeline.estado_pipeline_Services import ESTADO, RESULTADOS, avisar_paso


def ejecutar_pasos():
    try:
        from epidemiologia.services.dengue.alertas_Services    import procesar_alertas
        from epidemiologia.services.dengue.canal_Services      import procesar_canal
        from epidemiologia.services.dengue.clustering_Services import procesar_clustering
        from epidemiologia.services.dengue.depuracion_Services import depurar_base
        from epidemiologia.services.dengue.duplicados_Services import procesar_duplicados
        from epidemiologia.services.dengue.mapa_Services       import procesar_mapa
        from epidemiologia.modulos.dengue.fechas               import año_epidemiologico_actual

        # El año sale de la fecha de cada corrida (antes era un 2026 fijo en config.py)
        año = año_epidemiologico_actual()

        # 1. Depurar la base operativa (con el cruce de SisCep)
        avisar_paso("Depurando base operativa...")
        df = depurar_base(str(RUTA_OPERATIVA), str(RUTA_SISCEP))

        # 2. Duplicados
        avisar_paso("Detectando duplicados...")
        df, RESULTADOS["duplicados"], RESULTADOS["posibles_duplicados"] = procesar_duplicados(df)

        # 3. Canal endemico
        avisar_paso("Calculando canal endémico...")
        RESULTADOS["canal"] = procesar_canal(df, año)

        # 4. Alertas SisCep
        avisar_paso("Generando alertas SisCep...")
        RESULTADOS["alertas"] = procesar_alertas(df, año)

        # 5. Clustering y mapas
        avisar_paso("Ejecutando clustering geoespacial...")
        clust = procesar_clustering(df)
        RESULTADOS["mapa"] = {
            "situacion"  : procesar_mapa(clust, "situacion",    año),
            "confirmados": procesar_mapa(clust, "confirmados",  año),
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
