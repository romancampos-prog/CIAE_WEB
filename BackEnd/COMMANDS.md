# Comandos — Backend

> Referencia completa (versiones, frontend, PM2, producción) en `/COMMANDS.md` (raíz del proyecto).

## Activar entorno virtual

```bash
# Windows
venv\Scripts\activate

# Linux / Mac
source venv/bin/activate
```

## Iniciar servidor de desarrollo

```bash
uvicorn main:app --reload --port 8005
```

> API en `http://localhost:8005` · Docs en `http://localhost:8005/docs`

## Instalar nueva librería

```bash
pip install nombre-libreria
pip freeze > requirements.txt
```

## Primera vez (entorno nuevo)

```bash
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

## Salir del entorno virtual

```bash
deactivate
```
