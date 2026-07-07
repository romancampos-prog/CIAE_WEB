"""
Módulo  : cors.py
Carpeta : configs/
Qué hace: Define los origins permitidos según el ambiente (desarrollo o producción).
Usado en: main.py
"""
import os

AMBIENTE = os.getenv("AMBIENTE", "desarrollo")

ORIGINS_DESARROLLO = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

ORIGINS_PRODUCCION = [
    "https://occ00486wsciae:8005",
    "https://occ00486wsciae",
    "https://localhost:8005",
    "https://localhost",
]

ORIGINS = ORIGINS_DESARROLLO + ORIGINS_PRODUCCION if AMBIENTE == "desarrollo" else ORIGINS_PRODUCCION

ORIGINS_REGEX = r"https?://\w[\w\-]*:\d+"
