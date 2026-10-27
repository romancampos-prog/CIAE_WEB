"""
Pares candidatos a duplicado: solo se comparan registros con el mismo Soundex del apellido
paterno (blocking), en vez de todos contra todos.
Usado en: modulos/dengue/duplicados/deteccion.py
"""
import itertools

import jellyfish

from epidemiologia.modulos.dengue.duplicados.campos_registro import texto_limpio


def generar_candidatos(df):
    """
    Aplica blocking por Soundex del apellido paterno.
    Reduce comparaciones de O(n²) a O(k²) por bloque.
    """

    df = df.copy().reset_index(drop=True)
    df['_BLQ'] = df.apply(
        lambda r: jellyfish.soundex(texto_limpio(r.get('IDE_APE_PAT')))
                  if texto_limpio(r.get('IDE_APE_PAT')) else 'UNKNOWN',
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
