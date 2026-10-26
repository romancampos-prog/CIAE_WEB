"""
Deteccion de duplicados en produccion: por cada par candidato, 1) excepciones de negocio,
2) clasificacion (modelo entrenado si existe; si no, umbral de similitud) y 3) reglas de
resolucion para saber cual se elimina. El modelo lo carga quien llama (datos/modelo_duplicados_datos.py).
Usado en: services/duplicados_service.py
"""
from epidemiologia.modulos.duplicados.campos_registro import DIFF_DIAS_MAX
from epidemiologia.modulos.duplicados.candidatos import generar_candidatos
from epidemiologia.modulos.duplicados.excepciones import aplicar_excepciones
from epidemiologia.modulos.duplicados.formato_posibles import armar_posible_duplicado
from epidemiologia.modulos.duplicados.reglas_resolucion import aplicar_reglas_resolucion
from epidemiologia.modulos.duplicados.similitud import INDICE_FEATURE, calcular_vector

# Umbrales para "posibles no confirmados" — mismos campos que la detección
# principal (sim_ape_pat / sim_ape_mat / sim_nombre) pero ligeramente relajados
# para no perderse casos borderline que merecen revisión manual.
# Detección confirmada usa: 0.92 / 0.85 / 0.88
_POSIBLE_APE_PAT = 0.80

_POSIBLE_APE_MAT = 0.65

_POSIBLE_NOMBRE  = 0.70


def detectar_duplicados(df, modelo=None, umbral_confianza=0.70):
    """
    Función principal de producción.

    Flujo por cada par candidato:
        1. Excepciones de negocio          → si aplica, NO es duplicado
        2. Clasificación MLP / RF / umbral → ¿es duplicado?
        3. Reglas de resolución            → ¿cuál se elimina?

    Parámetros:
        df               — DataFrame depurado
        modelo           — modelo entrenado (MLP / RF) o None para usar el umbral de similitud
        umbral_confianza — probabilidad mínima para confiar en el modelo

    Devuelve:
        df_limpio  — DataFrame sin duplicados
        eliminados — lista de dicts con detalle de cada eliminación
        posibles   — pares con nombre + ap.paterno + ap.materno similares que NO
                     fueron confirmados como duplicados (por excepción o modelo)
    """

    print("=" * 55)
    print("DETECCIÓN DE DUPLICADOS")
    print("=" * 55)

    df          = df.copy().reset_index(drop=True)
    usar_modelo = modelo is not None

    if usar_modelo:
        tipo   = type(modelo.named_steps.get(
            'rf', modelo.named_steps.get('mlp', None))).__name__
        print(f"Modo: {tipo} (umbral={umbral_confianza})")
    else:
        print("Modo: fallback por umbral de similitud (modelo no entrenado)")

    print(f"\n[1] Generando candidatos por blocking...")
    candidatos = generar_candidatos(df)

    if not candidatos:
        print("Sin candidatos — no hay duplicados potenciales")
        return df, [], []

    print(f"\n[2] Evaluando {len(candidatos)} pares candidatos...")
    a_eliminar = set()
    eliminados = []
    posibles   = []
    excluidos  = 0

    for i, j in candidatos:
        if i in a_eliminar or j in a_eliminar:
            continue

        row_a = df.iloc[i].to_dict()
        row_b = df.iloc[j].to_dict()

        # Calcular vector una sola vez para todo el flujo
        vec = calcular_vector(row_a, row_b).reshape(1, -1)
        es_candidato_posible = (
            vec[0][INDICE_FEATURE['sim_ape_pat']] >= _POSIBLE_APE_PAT and
            vec[0][INDICE_FEATURE['sim_ape_mat']] >= _POSIBLE_APE_MAT and
            vec[0][INDICE_FEATURE['sim_nombre']]  >= _POSIBLE_NOMBRE
        )

        # Paso 1: excepciones de negocio
        es_excepcion, razon_excepcion = aplicar_excepciones(row_a, row_b)

        if es_excepcion:
            excluidos += 1
            if es_candidato_posible:
                posibles.append(armar_posible_duplicado(row_a, row_b, vec[0], razon_excepcion))
            continue

        # Paso 2: clasificación
        metodo = 'UMBRAL'

        if usar_modelo:
            prob = modelo.predict_proba(vec)[0][1]

            if prob >= umbral_confianza:
                es_duplicado = True
                metodo       = tipo
            elif prob < (1 - umbral_confianza):
                es_duplicado = False
                metodo       = tipo
            else:
                es_duplicado = (
                    vec[0][INDICE_FEATURE['sim_ape_pat']] >= 0.92 and
                    vec[0][INDICE_FEATURE['sim_ape_mat']] >= 0.85 and
                    vec[0][INDICE_FEATURE['sim_nombre' ]] >= 0.88
                )
        else:
            es_duplicado = (
                vec[0][INDICE_FEATURE['sim_ape_pat']] >= 0.92 and
                vec[0][INDICE_FEATURE['sim_ape_mat']] >= 0.85 and
                vec[0][INDICE_FEATURE['sim_nombre' ]] >= 0.88
            )

        if not es_duplicado:
            if es_candidato_posible:
                posibles.append(armar_posible_duplicado(row_a, row_b, vec[0], 'modelo_no_clasifico'))
            continue

        # Paso 3: reglas de resolución
        vec_id_eliminar = aplicar_reglas_resolucion(row_a, row_b)
        idx_eliminar    = i if row_a['VEC_ID'] == vec_id_eliminar else j
        a_eliminar.add(idx_eliminar)

        eliminados.append({
            'VEC_ID_ELIMINADO' : vec_id_eliminar,
            'VEC_ID_CONSERVADO': row_b['VEC_ID'] if idx_eliminar == i
                                 else row_a['VEC_ID'],
            'SIM_NOMBRE'       : round(float(vec[0][0]), 3),
            'SIM_APE_PAT'      : round(float(vec[0][1]), 3),
            'SIM_APE_MAT'      : round(float(vec[0][2]), 3),
            'DIFF_SINT_DIAS'   : round(float(vec[0][5]) * DIFF_DIAS_MAX, 1),
            'METODO'           : metodo
        })

    df_limpio = df.drop(index=list(a_eliminar)).reset_index(drop=True)

    print(f"\n[3] Resultados:")
    print(f"  Pares excluidos por excepción : {excluidos}")
    print(f"  Duplicados detectados         : {len(eliminados)}")
    print(f"  Posibles no confirmados       : {len(posibles)}")
    print(f"  Registros antes               : {len(df)}")
    print(f"  Registros después             : {len(df_limpio)}")

    return df_limpio, eliminados, posibles
