# Comandos del proyecto BackEnd

## Primera vez (solo una vez) -- se uso para crear un entorno virtual para las dependicas con py
python -m venv venv    
pip install -r requirements.txt

## #------- PARA TRABAJAR EN EL PROYECTO EJECUTARE EN ORDEN -------# 
## Cada vez que abres el proyecto
venv\Scripts\activate.bat
venv\Scripts\activate

## Iniciar el servidor  --servidor trabajando en el puerto 8005
uvicorn main:app --reload --port 8005

## Cuando instalas una librería nueva
pip install nombre-libreria
pip freeze > requirements.txt

## Salir del entorno virtual
deactivate
