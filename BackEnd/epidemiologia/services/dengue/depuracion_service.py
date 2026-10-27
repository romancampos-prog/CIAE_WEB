"""
Depuracion de la base operativa: leerla, filtrar IMSS Guanajuato, limpiar texto, ubicacion,
cruce con SisCep, semana epidemiologica y clasificacion final del caso.
Usado en: services/dengue/pipeline/pasos_pipeline_service.py
"""
from epidemiologia.datos.dengue.bases_dengue_datos import cargar_base, cargar_siscep
from epidemiologia.modulos.dengue.depuracion.asignar_semana import asignar_semana_epi
from epidemiologia.modulos.dengue.depuracion.clasificacion_caso import clasificar_caso_final
from epidemiologia.modulos.dengue.depuracion.cruce_siscep import cruzar_siscep
from epidemiologia.modulos.dengue.depuracion.filtrar_imss import filtrar_imss_gto
from epidemiologia.modulos.dengue.depuracion.limpiar_texto import limpiar_campos
from epidemiologia.modulos.dengue.depuracion.ubicacion_geografica import asignar_jerarquia_geo


def depurar_base(ruta_operativa, ruta_siscep=None):
    """
    Función principal del módulo. Ejecuta el pipeline completo de depuración:
    1. Carga la base operativa
    2. Filtra IMSS Guanajuato
    3. Limpia campos de texto
    4. Asigna jerarquía geográfica
    5. Cruza con SisCep (opcional, si se proporciona ruta)
    6. Calcular semana epidemiologica

    Devuelve el DataFrame depurado y listo para los módulos siguientes.
    """

    print("="*50)
    print("INICIANDO DEPURACIÓN DE BASE OPERATIVA")
    print("="*50)

    # Paso 1 — Carga
    df = cargar_base(ruta_operativa)

    # Paso 2 — Filtro institucional
    print("\n[2] Filtrando IMSS Guanajuato...")
    df = filtrar_imss_gto(df)

    # Paso 3 — Limpieza de texto
    print("\n[3] Limpiando campos de texto...")
    df = limpiar_campos(df)

    # Paso 4 — Jerarquía geográfica
    print("\n[4] Asignando ubicación geográfica...")
    df = asignar_jerarquia_geo(df)

    # Paso 5 — Cruce SisCep (opcional)
    if ruta_siscep:
        print("\n[5] Cargando y cruzando SisCep...")
        df_siscep = cargar_siscep(ruta_siscep)
        df = cruzar_siscep(df, df_siscep)
    else:
        print("\n[5] SisCep no proporcionada, se omite el cruce.")
        df['ESTATUS_SISCEP'] = 'sin resultado'

    # Paso 6 — Semana epidemiológica
    print("\n[6] Calculando semana epidemiológica...")
    df = asignar_semana_epi(df)

    # Paso 7 — Clasificación final del caso (SisCep + Dx final)
    print("\n[7] Clasificando caso final...")
    df = clasificar_caso_final(df)

    print("\n" + "="*50)
    print(f"DEPURACIÓN COMPLETADA — {len(df)} registros listos")
    print("="*50)

    df = df.reset_index(drop=True)

    return df
