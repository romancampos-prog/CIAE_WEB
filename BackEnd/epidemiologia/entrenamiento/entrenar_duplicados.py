"""
Entrenamiento del modelo de duplicados (se corre a mano, NO lo usa el pipeline):
compara MLP vs Random Forest con Grid Search y guarda el mejor en
epidemiologia/modelos/mlp_duplicados.pkl. Mientras ese archivo no exista, la deteccion usa el
umbral de similitud.
  python -m epidemiologia.entrenamiento.entrenar_duplicados <ruta_clasificacion.xlsx>   (desde BackEnd/)
"""
import itertools
import os

import jellyfish
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import GridSearchCV, StratifiedKFold
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.utils import resample

from epidemiologia.datos.dengue.modelo_duplicados_Datos import RUTA_MODELO
from epidemiologia.modulos.dengue.duplicados.campos_registro import texto_limpio
from epidemiologia.modulos.dengue.duplicados.similitud import NOMBRES_FEATURES, calcular_vector


def _generar_pares_sinteticos(df, max_pares=80):
    """
    Genera pares negativos sintéticos automáticamente.
    Busca pares de GRUPOS DISTINTOS en el mismo bloque fonético.
    Se etiquetan como 0 (no duplicado) sin revisión manual.
    """

    df = df.copy().reset_index(drop=True)
    df['_BLQ'] = df['IDE_APE_PAT'].apply(
        lambda x: jellyfish.soundex(texto_limpio(x)) if texto_limpio(x) else 'UNKNOWN'
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


##--------------------------------------

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


##--------------------------------------

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


##--------------------------------------

def comparar_y_entrenar(ruta_etiquetada):
    """
    Compara MLP vs Random Forest con Grid Search + StratifiedKFold.
    Guarda automáticamente el modelo con mejor F1 promedio.

    Ejecutar manualmente una sola vez:
        python -m epidemiologia.entrenamiento.entrenar_duplicados <ruta_clasificacion.xlsx>
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


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print("Uso: python -m epidemiologia.entrenamiento.entrenar_duplicados <ruta_clasificacion.xlsx>")
        sys.exit(1)
    comparar_y_entrenar(sys.argv[1])
