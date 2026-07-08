import pandas as pd
import numpy as np
import os
import joblib
import itertools
import jellyfish
from sklearn.neural_network       import MLPClassifier
from sklearn.ensemble             import RandomForestClassifier
from sklearn.model_selection      import StratifiedKFold, cross_val_score, GridSearchCV
from sklearn.preprocessing        import StandardScaler
from sklearn.pipeline             import Pipeline
from sklearn.metrics              import classification_report
from sklearn.utils                import resample


# ════════════════════════════════════════════════════════════════════════
# CONSTANTES
# ════════════════════════════════════════════════════════════════════════

RUTA_MODELO = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    '..', 'modelos', 'mlp_duplicados.pkl'
)

JERARQUIA_DIAG = {
    'DENGUE GRAVE'                : 3,
    'DENGUE CON SIGNOS DE ALARMA' : 2,
    'DENGUE NO GRAVE'             : 1,
    'OTROS'                       : 0,
}

DIFF_DIAS_MAX    = 60
UMBRAL_SINT_DIAS = 15
DIAS_POSITIVO    = 14




# ════════════════════════════════════════════════════════════════════════
# 1. UTILIDADES COMPARTIDAS
# ════════════════════════════════════════════════════════════════════════

def _safe_str(val):
    if pd.isna(val):
        return ''
    return str(val).strip().upper()


def _tiene_resultado(row):
    return bool(_safe_str(row.get('DES_DIAG_FINAL', '')))


def _tiene_muestra(row):
    try:
        return int(row.get('MUESTRA_LABORATORIO', 0)) == 1
    except Exception:
        return False


def _nivel_diagnostico(row):
    diag = _safe_str(row.get('DES_DIAG_PROBABLE', ''))
    return JERARQUIA_DIAG.get(diag, 0)




def _ordenar_por_fecha(row_a, row_b):
    try:
        fa = pd.Timestamp(row_a['FEC_NOTIF_EDO']) if pd.notna(
            row_a.get('FEC_NOTIF_EDO')) else None
        fb = pd.Timestamp(row_b['FEC_NOTIF_EDO']) if pd.notna(
            row_b.get('FEC_NOTIF_EDO')) else None
        if fa and fb:
            return (row_a, row_b) if fa <= fb else (row_b, row_a)
    except Exception:
        pass
    return row_a, row_b




def _diff_notif_dias(row_a, row_b):
    try:
        fa = pd.Timestamp(row_a['FEC_NOTIF_EDO']) if pd.notna(
            row_a.get('FEC_NOTIF_EDO')) else None
        fb = pd.Timestamp(row_b['FEC_NOTIF_EDO']) if pd.notna(
            row_b.get('FEC_NOTIF_EDO')) else None
        if fa and fb:
            return abs((fa - fb).days)
    except Exception:
        pass
    return None




# ════════════════════════════════════════════════════════════════════════
# 2. REGLAS DE EXCEPCIÓN
# ════════════════════════════════════════════════════════════════════════

def excepcion_resultado_negativo(row_a, row_b):
    """
    EXCEPCIÓN 1 — Resultado negativo previo.
    Si el primer registro notificado tiene resultado OTROS (negativo),
    el paciente puede re-notificarse sin que se considere duplicado.
    """
    primero, _ = _ordenar_por_fecha(row_a, row_b)
    return _safe_str(primero.get('DES_DIAG_FINAL', '')) == 'OTROS'




def excepcion_positivo_14_dias(row_a, row_b):
    """
    EXCEPCIÓN 2 — Resultado positivo con más de 14 días de diferencia.
    Si el primer registro tiene resultado positivo y han pasado más de
    14 días, es un episodio nuevo y no se considera duplicado.
    """
    primero, _ = _ordenar_por_fecha(row_a, row_b)
    dias        = _diff_notif_dias(row_a, row_b)
    if dias is None:
        return False
    if _tiene_resultado(primero):
        diag = _safe_str(primero.get('DES_DIAG_FINAL', ''))
        if diag != 'OTROS' and dias > DIAS_POSITIVO:
            return True
    return False




def excepcion_diferencia_sintomas(row_a, row_b):
    """
    EXCEPCIÓN 3 — Diferencia en inicio de síntomas mayor a 15 días.
    Si las fechas de inicio de signos y síntomas difieren más de
    UMBRAL_SINT_DIAS días, son episodios clínicos distintos.
    """
    try:
        sa = pd.Timestamp(row_a['FEC_INI_SIGNOS_SINT']) if pd.notna(
            row_a.get('FEC_INI_SIGNOS_SINT')) else None
        sb = pd.Timestamp(row_b['FEC_INI_SIGNOS_SINT']) if pd.notna(
            row_b.get('FEC_INI_SIGNOS_SINT')) else None
        if sa and sb:
            return abs((sa - sb).days) > UMBRAL_SINT_DIAS
    except Exception:
        pass
    return False




def aplicar_excepciones(row_a, row_b):
    """
    Ejecuta todas las excepciones en orden.
    Devuelve (True, nombre) si alguna aplica, (False, None) si no.
    """
    if excepcion_resultado_negativo(row_a, row_b):
        return True, 'resultado_negativo_previo'
    if excepcion_positivo_14_dias(row_a, row_b):
        return True, 'positivo_mas_14_dias'
    if excepcion_diferencia_sintomas(row_a, row_b):
        return True, 'diferencia_sintomas_15_dias'
    return False, None




# ════════════════════════════════════════════════════════════════════════
# 3. REGLAS DE RESOLUCIÓN
# ════════════════════════════════════════════════════════════════════════

def regla_uno_con_resultado(row_a, row_b):
    """
    REGLA 1 — Solo uno tiene resultado o clasificación final.
    Conservar el que tiene DES_DIAG_FINAL. Eliminar el que no tiene.
    """
    tiene_a = _tiene_resultado(row_a)
    tiene_b = _tiene_resultado(row_b)
    if tiene_a and not tiene_b:
        return row_b['VEC_ID']
    if tiene_b and not tiene_a:
        return row_a['VEC_ID']
    return None




def regla_uno_con_muestra(row_a, row_b):
    """
    REGLA 2 — Solo uno tiene muestra de laboratorio (ninguno tiene DES_DIAG_FINAL aún).
    Conservar el que tiene muestra. Eliminar el que no tiene.
    """
    if _tiene_resultado(row_a) or _tiene_resultado(row_b):
        return None
    tiene_a = _tiene_muestra(row_a)
    tiene_b = _tiene_muestra(row_b)
    if tiene_a and not tiene_b:
        return row_b['VEC_ID']
    if tiene_b and not tiene_a:
        return row_a['VEC_ID']
    return None




def regla_mayor_severidad_sin_resultado(row_a, row_b):
    """
    REGLA 3 — Ambos con muestra, sin resultado final, distinto diagnóstico probable.
    Conservar el de mayor severidad (DES_DIAG_PROBABLE).
    Cubre: mismo día con distinta severidad, y días distintos con distinta severidad.
    """
    if _tiene_resultado(row_a) or _tiene_resultado(row_b):
        return None
    if not (_tiene_muestra(row_a) and _tiene_muestra(row_b)):
        return None
    nivel_a = _nivel_diagnostico(row_a)
    nivel_b = _nivel_diagnostico(row_b)
    if nivel_a > nivel_b:
        return row_b['VEC_ID']
    if nivel_b > nivel_a:
        return row_a['VEC_ID']
    return None




def regla_ambos_con_resultado(row_a, row_b):
    """
    REGLA 4 — Ambos tienen resultado.
    Conservar el de FEC_NOTIF_EDO más antigua. Eliminar el más reciente.
    """
    if not (_tiene_resultado(row_a) and _tiene_resultado(row_b)):
        return None
    try:
        fa = pd.Timestamp(row_a['FEC_NOTIF_EDO']) if pd.notna(
            row_a.get('FEC_NOTIF_EDO')) else None
        fb = pd.Timestamp(row_b['FEC_NOTIF_EDO']) if pd.notna(
            row_b.get('FEC_NOTIF_EDO')) else None
        if fa and fb and fa != fb:
            return row_b['VEC_ID'] if fa < fb else row_a['VEC_ID']
    except Exception:
        pass
    return None




def regla_misma_fecha_ambos_resultado(row_a, row_b):
    """
    REGLA 5 — Ambos con resultado y misma fecha de notificación.
    Conservar mayor severidad: Dengue Grave > D. Signos Alarma > Dengue No Grave.
    """
    if not (_tiene_resultado(row_a) and _tiene_resultado(row_b)):
        return None
    nivel_a = _nivel_diagnostico(row_a)
    nivel_b = _nivel_diagnostico(row_b)
    if nivel_a > nivel_b:
        return row_b['VEC_ID']
    if nivel_b > nivel_a:
        return row_a['VEC_ID']
    return max(row_a['VEC_ID'], row_b['VEC_ID'])




def regla_sin_muestra(row_a, row_b):
    """
    REGLA 6 — Ninguno tiene muestra de laboratorio.
    Conservar MENOR severidad: Dengue No Grave > D. Signos Alarma > Dengue Grave.
    """
    if _tiene_muestra(row_a) or _tiene_muestra(row_b):
        return None
    nivel_a = _nivel_diagnostico(row_a)
    nivel_b = _nivel_diagnostico(row_b)
    if nivel_a < nivel_b:
        return row_b['VEC_ID']
    if nivel_b < nivel_a:
        return row_a['VEC_ID']
    return max(row_a['VEC_ID'], row_b['VEC_ID'])




def aplicar_reglas_resolucion(row_a, row_b):
    """
    Aplica las reglas de resolución en orden de prioridad.
    Devuelve el VEC_ID del registro a ELIMINAR.
    """
    for regla in [regla_uno_con_resultado,
                  regla_uno_con_muestra,
                  regla_mayor_severidad_sin_resultado,
                  regla_ambos_con_resultado,
                  regla_misma_fecha_ambos_resultado,
                  regla_sin_muestra]:
        resultado = regla(row_a, row_b)
        if resultado:
            return resultado
    _, segundo = _ordenar_por_fecha(row_a, row_b)
    return segundo['VEC_ID']




# ════════════════════════════════════════════════════════════════════════
# 4. VECTOR DE SIMILITUD CON FEATURE ENGINEERING (14 features)
# ════════════════════════════════════════════════════════════════════════

NOMBRES_FEATURES = [
    'sim_nombre', 'sim_ape_pat', 'sim_ape_mat',
    'soundex_pat', 'soundex_mat',
    'diff_sintomas', 'diff_notif',
    'primero_negativo', 'ambos_resultado',
    'excepcion_negativo', 'excepcion_14dias', 'excepcion_sintomas',
    'uno_con_resultado', 'diff_severidad'
]

# Índice rápido por nombre de feature (módulo-nivel para reusar en helpers)
_IDX = {nombre: i for i, nombre in enumerate(NOMBRES_FEATURES)}




def calcular_vector(row_a, row_b):
    """
    Vector de similitud enriquecido con outputs de reglas de negocio (14 features).

    Similitud de nombres [0-4]:
      sim_nombre, sim_ape_pat, sim_ape_mat, soundex_pat, soundex_mat

    Temporales [5-6]:
      diff_sintomas  — diferencia FEC_INI_SIGNOS_SINT normalizada (0-1)
      diff_notif     — diferencia FEC_NOTIF_EDO normalizada (0-1)

    Reglas de negocio [7-13]:
      primero_negativo  — 1 si el más antiguo tiene resultado OTROS
      ambos_resultado   — 1 si ambos tienen DES_DIAG_FINAL
      excepcion_negativo — output de excepcion_resultado_negativo()
      excepcion_14dias   — output de excepcion_positivo_14_dias()
      excepcion_sintomas — output de excepcion_diferencia_sintomas()
      uno_con_resultado  — 1 si exactamente uno tiene DES_DIAG_FINAL
      diff_severidad     — diferencia absoluta de nivel diagnóstico normalizada
    """
    # ── Similitud de nombres [0-4] ────────────────────────────────────
    nom_a = _safe_str(row_a.get('IDE_NOM'))
    nom_b = _safe_str(row_b.get('IDE_NOM'))
    pat_a = _safe_str(row_a.get('IDE_APE_PAT'))
    pat_b = _safe_str(row_b.get('IDE_APE_PAT'))
    mat_a = _safe_str(row_a.get('IDE_APE_MAT'))
    mat_b = _safe_str(row_b.get('IDE_APE_MAT'))

    sim_nombre  = jellyfish.jaro_winkler_similarity(nom_a, nom_b) if nom_a and nom_b else 0.0
    sim_ape_pat = jellyfish.jaro_winkler_similarity(pat_a, pat_b) if pat_a and pat_b else 0.0
    sim_ape_mat = jellyfish.jaro_winkler_similarity(mat_a, mat_b) if mat_a and mat_b else 0.0
    soundex_pat = 1.0 if (pat_a and pat_b and
                          jellyfish.soundex(pat_a) == jellyfish.soundex(pat_b)) else 0.0
    soundex_mat = 1.0 if (mat_a and mat_b and
                          jellyfish.soundex(mat_a) == jellyfish.soundex(mat_b)) else 0.0

    # ── Diferencia síntomas [5] ───────────────────────────────────────
    try:
        sa = pd.Timestamp(row_a['FEC_INI_SIGNOS_SINT']) if pd.notna(
            row_a.get('FEC_INI_SIGNOS_SINT')) else None
        sb = pd.Timestamp(row_b['FEC_INI_SIGNOS_SINT']) if pd.notna(
            row_b.get('FEC_INI_SIGNOS_SINT')) else None
        diff_sint = min(abs((sa - sb).days), DIFF_DIAS_MAX) / DIFF_DIAS_MAX \
                    if sa and sb else 0.5
    except Exception:
        diff_sint = 0.5

    # ── Diferencia notificación [6] ───────────────────────────────────
    dias_notif = _diff_notif_dias(row_a, row_b)
    diff_notif = min(dias_notif, DIFF_DIAS_MAX) / DIFF_DIAS_MAX \
                 if dias_notif is not None else 0.5

    # ── Features de resultado [7-8] ───────────────────────────────────
    primero, _    = _ordenar_por_fecha(row_a, row_b)
    prim_negativo = 1.0 if _safe_str(primero.get('DES_DIAG_FINAL', '')) == 'OTROS' else 0.0
    ambos_result  = 1.0 if (_tiene_resultado(row_a) and _tiene_resultado(row_b)) else 0.0

    # ── Outputs de excepciones [9-11] ────────────────────────────────
    f_exc_neg  = 1.0 if excepcion_resultado_negativo(row_a, row_b)  else 0.0
    f_exc_14   = 1.0 if excepcion_positivo_14_dias(row_a, row_b)    else 0.0
    f_exc_sint = 1.0 if excepcion_diferencia_sintomas(row_a, row_b) else 0.0

    # ── Uno con resultado [12] ────────────────────────────────────────
    uno_resultado = 1.0 if (_tiene_resultado(row_a) ^ _tiene_resultado(row_b)) else 0.0

    # ── Diferencia de severidad [13] ─────────────────────────────────
    diff_severidad = abs(_nivel_diagnostico(row_a) - _nivel_diagnostico(row_b)) / 2.0

    return np.array([
        sim_nombre, sim_ape_pat, sim_ape_mat, soundex_pat, soundex_mat,
        diff_sint, diff_notif,
        prim_negativo, ambos_result,
        f_exc_neg, f_exc_14, f_exc_sint,
        uno_resultado, diff_severidad
    ])




# ════════════════════════════════════════════════════════════════════════
# 5. GENERACIÓN DE PARES DE ENTRENAMIENTO
# ════════════════════════════════════════════════════════════════════════

def _generar_pares_sinteticos(df, max_pares=80):
    """
    Genera pares negativos sintéticos automáticamente.
    Busca pares de GRUPOS DISTINTOS en el mismo bloque fonético.
    Se etiquetan como 0 (no duplicado) sin revisión manual.
    """
    df = df.copy().reset_index(drop=True)
    df['_BLQ'] = df['IDE_APE_PAT'].apply(
        lambda x: jellyfish.soundex(_safe_str(x)) if _safe_str(x) else 'UNKNOWN'
    )

    X_sint, y_sint = [], []

    for _, bloque in df.groupby('_BLQ'):
        if len(bloque) < 2:
            continue
        indices = bloque.index.tolist()
        for i, j in itertools.combinations(indices, 2):
            row_a = df.iloc[i].to_dict()
            row_b = df.iloc[j].to_dict()
            if row_a.get('GRUPO') == row_b.get('GRUPO'):
                continue
            X_sint.append(calcular_vector(row_a, row_b))
            y_sint.append(0)
            if len(y_sint) >= max_pares:
                break
        if len(y_sint) >= max_pares:
            break

    print(f"  Pares sintéticos negativos: {len(y_sint)}")
    return np.array(X_sint) if X_sint else np.empty((0, 14)), np.array(y_sint)




def generar_pares_entrenamiento(ruta_etiquetada, incluir_sinteticos=True):
    """
    Lee la base etiquetada y genera pares de entrenamiento.

    Columnas requeridas:
        GRUPO, ES_DUPLICADO, VEC_ID,
        IDE_NOM, IDE_APE_PAT, IDE_APE_MAT,
        FEC_INI_SIGNOS_SINT, FEC_NOTIF_EDO,
        DES_DIAG_FINAL, DES_DIAG_PROBABLE, MUESTRA_LABORATORIO

    Etiquetado:
        Par con al menos un ES_DUPLICADO=0 → etiqueta=1 (duplicado real)
        Par con ambos ES_DUPLICADO=1       → etiqueta=0 (re-notificación válida)
    """
    df = pd.read_excel(ruta_etiquetada)
    df['FEC_INI_SIGNOS_SINT'] = pd.to_datetime(df['FEC_INI_SIGNOS_SINT'], errors='coerce')
    df['FEC_NOTIF_EDO']       = pd.to_datetime(df['FEC_NOTIF_EDO'],       errors='coerce')

    X_reales, y_reales = [], []

    for _, grupo in df.groupby('GRUPO'):
        registros = grupo.reset_index(drop=True)
        for i, j in itertools.combinations(range(len(registros)), 2):
            row_a    = registros.iloc[i].to_dict()
            row_b    = registros.iloc[j].to_dict()
            etiqueta = 1 if (row_a['ES_DUPLICADO'] == 0 or
                             row_b['ES_DUPLICADO'] == 0) else 0
            X_reales.append(calcular_vector(row_a, row_b))
            y_reales.append(etiqueta)

    X_reales = np.array(X_reales)
    y_reales = np.array(y_reales)

    print(f"Pares reales              : {len(y_reales)}")
    print(f"  Duplicados reales       : {y_reales.sum()}")
    print(f"  Re-notificaciones válidas: {(y_reales == 0).sum()}")

    if incluir_sinteticos:
        X_sint, y_sint = _generar_pares_sinteticos(df)
        if len(y_sint) > 0:
            X = np.vstack([X_reales, X_sint])
            y = np.concatenate([y_reales, y_sint])
        else:
            X, y = X_reales, y_reales
        print(f"Total pares              : {len(y)}")
    else:
        X, y = X_reales, y_reales

    return X, y




def _balancear(X, y):
    """Balancea clases por oversampling de la minoritaria."""
    X_pos = X[y == 1]
    y_pos = y[y == 1]
    X_neg = X[y == 0]
    y_neg = y[y == 0]
    n_max = max(len(y_pos), len(y_neg))
    if len(y_pos) < n_max:
        X_pos, y_pos = resample(X_pos, y_pos, n_samples=n_max, random_state=42)
    else:
        X_neg, y_neg = resample(X_neg, y_neg, n_samples=n_max, random_state=42)
    X_bal = np.vstack([X_pos, X_neg])
    y_bal = np.concatenate([y_pos, y_neg])
    print(f"  Pares balanceados: {len(y_bal)} "
          f"({y_bal.sum()} duplicados, {(y_bal==0).sum()} no duplicados)")
    return X_bal, y_bal




# ════════════════════════════════════════════════════════════════════════
# 6. COMPARACIÓN MLP vs RANDOM FOREST CON GRID SEARCH
# ════════════════════════════════════════════════════════════════════════

def comparar_y_entrenar(ruta_etiquetada):
    """
    Compara MLP vs Random Forest con Grid Search + StratifiedKFold.
    Guarda automáticamente el modelo con mejor F1 promedio.

    Ejecutar manualmente una sola vez:
        python modulos/duplicados.py <ruta_clasificacion.xlsx>
    """
    print("=" * 55)
    print("COMPARACIÓN MLP vs RANDOM FOREST")
    print("=" * 55)

    print("\n[1] Generando pares de entrenamiento...")
    X, y = generar_pares_entrenamiento(ruta_etiquetada, incluir_sinteticos=True)

    print("\n[2] Balanceando clases...")
    X_bal, y_bal = _balancear(X, y)

    kf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    # ── Grid Search MLP ───────────────────────────────────────────────
    print("\n[3] Grid Search — MLP...")
    grid_mlp = {
        'mlp__hidden_layer_sizes': [(14,), (14, 7), (14, 7, 4), (20, 10)],
        'mlp__alpha'             : [0.0001, 0.001, 0.01],
    }
    pipeline_mlp = Pipeline([
        ('scaler', StandardScaler()),
        ('mlp', MLPClassifier(
            activation          = 'relu',
            solver              = 'adam',
            max_iter            = 500,
            random_state        = 42,
            early_stopping      = True,
            validation_fraction = 0.1
        ))
    ])
    gs_mlp = GridSearchCV(
        pipeline_mlp, grid_mlp,
        cv=kf, scoring='f1', n_jobs=-1, verbose=0
    )
    gs_mlp.fit(X_bal, y_bal)

    f1_mlp  = gs_mlp.best_score_
    std_mlp = gs_mlp.cv_results_['std_test_score'][gs_mlp.best_index_]
    print(f"  Mejor configuración : {gs_mlp.best_params_}")
    print(f"  F1 promedio         : {f1_mlp:.3f} ± {std_mlp:.3f}")
    print("\n  Reporte mejor MLP:")
    print(classification_report(y_bal, gs_mlp.best_estimator_.predict(X_bal),
          target_names=['Re-notificacion valida', 'Duplicado real'],
          zero_division=0))

    # ── Grid Search Random Forest ─────────────────────────────────────
    print("\n[4] Grid Search — Random Forest...")
    grid_rf = {
        'rf__n_estimators'    : [50, 100, 200],
        'rf__max_depth'       : [3, 5, None],
        'rf__min_samples_leaf': [1, 2],
    }
    pipeline_rf = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestClassifier(
            class_weight = 'balanced',
            random_state = 42
        ))
    ])
    gs_rf = GridSearchCV(
        pipeline_rf, grid_rf,
        cv=kf, scoring='f1', n_jobs=-1, verbose=0
    )
    gs_rf.fit(X_bal, y_bal)

    f1_rf  = gs_rf.best_score_
    std_rf = gs_rf.cv_results_['std_test_score'][gs_rf.best_index_]
    print(f"  Mejor configuración : {gs_rf.best_params_}")
    print(f"  F1 promedio         : {f1_rf:.3f} ± {std_rf:.3f}")
    print("\n  Reporte mejor Random Forest:")
    print(classification_report(y_bal, gs_rf.best_estimator_.predict(X_bal),
          target_names=['Re-notificacion valida', 'Duplicado real'],
          zero_division=0))

    # ── Importancia de features (RF) ──────────────────────────────────
    rf_importancias = sorted(
        zip(NOMBRES_FEATURES,
            gs_rf.best_estimator_.named_steps['rf'].feature_importances_),
        key=lambda x: -x[1]
    )
    print("\n  Importancia de features (Random Forest):")
    for nombre, imp in rf_importancias:
        barra = '█' * int(imp * 40)
        print(f"    {nombre:<22} {imp:.3f} {barra}")

    # ── Comparación final ─────────────────────────────────────────────
    print("\n" + "=" * 55)
    print("RESULTADO DE LA COMPARACIÓN")
    print("=" * 55)
    print(f"  MLP            F1={f1_mlp:.3f} ± {std_mlp:.3f}")
    print(f"  Random Forest  F1={f1_rf:.3f} ± {std_rf:.3f}")

    if f1_rf >= f1_mlp:
        mejor_modelo = gs_rf.best_estimator_
        ganador      = 'Random Forest'
    else:
        mejor_modelo = gs_mlp.best_estimator_
        ganador      = 'MLP'

    print(f"\n  ✓ Modelo seleccionado: {ganador}")

    ruta_modelo = os.path.normpath(RUTA_MODELO)
    os.makedirs(os.path.dirname(ruta_modelo), exist_ok=True)
    joblib.dump(mejor_modelo, ruta_modelo)
    print(f"  Guardado en: {ruta_modelo}")

    return mejor_modelo, ganador




# ════════════════════════════════════════════════════════════════════════
# 7. HELPER PARA PARES SIMILARES NO CONFIRMADOS
# ════════════════════════════════════════════════════════════════════════

_RAZONES_LEGIBLES = {
    'resultado_negativo_previo'    : 'Resultado negativo previo',
    'positivo_mas_14_dias'         : 'Positivo con >14 días de diferencia',
    'diferencia_sintomas_15_dias'  : 'Síntomas con >15 días de diferencia',
    'modelo_no_clasifico'          : 'No confirmado por modelo',
}

def _hacer_posible(row_a, row_b, vec, razon):
    """Construye el dict de un par similar que no fue confirmado como duplicado."""

    def _s(val):
        """Convierte cualquier valor a str Python nativo, vacío si es nulo."""
        if val is None:
            return ''
        try:
            if pd.isna(val):
                return ''
        except (TypeError, ValueError):
            pass
        return str(val).strip()

    def _fec(val):
        try:
            ts = pd.Timestamp(val)
            return '' if pd.isna(ts) else ts.strftime('%Y-%m-%d')
        except Exception:
            return _s(val)

    def _row(row, campo):
        return _s(row.get(campo))

    return {
        'VEC_ID_A'        : _row(row_a, 'VEC_ID'),
        'IDE_NOM_A'       : _row(row_a, 'IDE_NOM'),
        'IDE_APE_PAT_A'   : _row(row_a, 'IDE_APE_PAT'),
        'IDE_APE_MAT_A'   : _row(row_a, 'IDE_APE_MAT'),
        'DES_DIAG_FINAL_A': _row(row_a, 'DES_DIAG_FINAL'),
        'CLASIF_A'        : _row(row_a, 'CLASIFICACION_FINAL'),
        'FEC_NOTIF_A'     : _fec(row_a.get('FEC_NOTIF_EDO')),
        'VEC_ID_B'        : _row(row_b, 'VEC_ID'),
        'IDE_NOM_B'       : _row(row_b, 'IDE_NOM'),
        'IDE_APE_PAT_B'   : _row(row_b, 'IDE_APE_PAT'),
        'IDE_APE_MAT_B'   : _row(row_b, 'IDE_APE_MAT'),
        'DES_DIAG_FINAL_B': _row(row_b, 'DES_DIAG_FINAL'),
        'CLASIF_B'        : _row(row_b, 'CLASIFICACION_FINAL'),
        'FEC_NOTIF_B'     : _fec(row_b.get('FEC_NOTIF_EDO')),
        'SIM_APE_PAT'     : round(float(vec[_IDX['sim_ape_pat']]), 3),
        'SIM_APE_MAT'     : round(float(vec[_IDX['sim_ape_mat']]), 3),
        'SIM_NOMBRE'      : round(float(vec[_IDX['sim_nombre']]),  3),
        'RAZON'           : _RAZONES_LEGIBLES.get(razon, razon or 'No confirmado por modelo'),
    }




# ════════════════════════════════════════════════════════════════════════
# 8. BLOCKING
# ════════════════════════════════════════════════════════════════════════

def generar_candidatos(df):
    """
    Aplica blocking por Soundex del apellido paterno.
    Reduce comparaciones de O(n²) a O(k²) por bloque.
    """
    df = df.copy().reset_index(drop=True)
    df['_BLQ'] = df.apply(
        lambda r: jellyfish.soundex(_safe_str(r.get('IDE_APE_PAT')))
                  if _safe_str(r.get('IDE_APE_PAT')) else 'UNKNOWN',
        axis=1
    )
    candidatos = []
    for _, grupo in df.groupby('_BLQ'):
        if len(grupo) < 2:
            continue
        for i, j in itertools.combinations(grupo.index.tolist(), 2):
            candidatos.append((i, j))
    print(f"Candidatos por blocking: {len(candidatos)}")
    return candidatos




# ════════════════════════════════════════════════════════════════════════
# 9. DETECCIÓN EN PRODUCCIÓN
# ════════════════════════════════════════════════════════════════════════

# Umbrales para "posibles no confirmados" — mismos campos que la detección
# principal (sim_ape_pat / sim_ape_mat / sim_nombre) pero ligeramente relajados
# para no perderse casos borderline que merecen revisión manual.
# Detección confirmada usa: 0.92 / 0.85 / 0.88
_POSIBLE_APE_PAT = 0.80
_POSIBLE_APE_MAT = 0.65
_POSIBLE_NOMBRE  = 0.70




def detectar_duplicados(df, umbral_confianza=0.70):
    """
    Función principal de producción.

    Flujo por cada par candidato:
        1. Excepciones de negocio          → si aplica, NO es duplicado
        2. Clasificación MLP / RF / umbral → ¿es duplicado?
        3. Reglas de resolución            → ¿cuál se elimina?

    Parámetros:
        df               — DataFrame depurado
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
    ruta_modelo = os.path.normpath(RUTA_MODELO)
    usar_modelo = os.path.exists(ruta_modelo)

    if usar_modelo:
        modelo = joblib.load(ruta_modelo)
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
            vec[0][_IDX['sim_ape_pat']] >= _POSIBLE_APE_PAT and
            vec[0][_IDX['sim_ape_mat']] >= _POSIBLE_APE_MAT and
            vec[0][_IDX['sim_nombre']]  >= _POSIBLE_NOMBRE
        )

        # Paso 1: excepciones de negocio
        es_excepcion, razon_excepcion = aplicar_excepciones(row_a, row_b)
        if es_excepcion:
            excluidos += 1
            if es_candidato_posible:
                posibles.append(_hacer_posible(row_a, row_b, vec[0], razon_excepcion))
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
                    vec[0][_IDX['sim_ape_pat']] >= 0.92 and
                    vec[0][_IDX['sim_ape_mat']] >= 0.85 and
                    vec[0][_IDX['sim_nombre' ]] >= 0.88
                )
        else:
            es_duplicado = (
                vec[0][_IDX['sim_ape_pat']] >= 0.92 and
                vec[0][_IDX['sim_ape_mat']] >= 0.85 and
                vec[0][_IDX['sim_nombre' ]] >= 0.88
            )

        if not es_duplicado:
            if es_candidato_posible:
                posibles.append(_hacer_posible(row_a, row_b, vec[0], 'modelo_no_clasifico'))
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




# ════════════════════════════════════════════════════════════════════════
# SCRIPT DE ENTRENAMIENTO (ejecutar manualmente una sola vez)
# ════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print("Uso: python modulos/duplicados.py <ruta_clasificacion.xlsx>")
        sys.exit(1)
    comparar_y_entrenar(sys.argv[1])
    