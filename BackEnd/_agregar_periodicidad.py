import json
from pathlib import Path

MAPEO_DIR = Path("indicadores/mapeo")
BD_DIR = Path("../../BD_CIAE/INDICADORES/2026")

actualizados = []
saltados = []

for mapeo_path in sorted(MAPEO_DIR.glob("*.json")):
    mapeo = json.loads(mapeo_path.read_text(encoding="utf-8"))
    familia = mapeo_path.stem  # CACU, CAMA, CE, ...

    for clave_indicador, datos in mapeo.items():
        periodicidad = datos.get("periodicidad")
        if periodicidad is None:
            saltados.append((clave_indicador, "sin 'periodicidad' en mapeo"))
            continue

        nombre_archivo = clave_indicador.replace(" ", "_") + ".json"
        ruta_reporte = BD_DIR / familia / nombre_archivo
        if not ruta_reporte.exists():
            saltados.append((clave_indicador, f"no existe {ruta_reporte}"))
            continue

        reporte = json.loads(ruta_reporte.read_text(encoding="utf-8"))
        if reporte.get("PERIODICIDAD") == periodicidad:
            saltados.append((clave_indicador, "ya tenia la misma periodicidad"))
            continue

        # reconstruye el dict para insertar PERIODICIDAD justo despues de ANIO,
        # respetando el orden de campos del modelo ReporteIndicador
        nuevo_reporte = {}
        for k, v in reporte.items():
            nuevo_reporte[k] = v
            if k == "ANIO":
                nuevo_reporte["PERIODICIDAD"] = periodicidad
        if "PERIODICIDAD" not in nuevo_reporte:
            nuevo_reporte["PERIODICIDAD"] = periodicidad

        ruta_reporte.write_text(
            json.dumps(nuevo_reporte, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        actualizados.append(str(ruta_reporte))

print(f"Actualizados: {len(actualizados)}")
for a in actualizados:
    print("  ", a)
print(f"Saltados: {len(saltados)}")
for s in saltados:
    print("  ", s)
