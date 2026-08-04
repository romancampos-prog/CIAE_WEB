/**
 * MODO PM2 — frontend compilado, backend estable
 * Antes de arrancar por primera vez (o tras cambios en el frontend):
 *   cd FrontEnd && npm run build
 *
 * Uso: pm2 start ecosystem.config.cjs
 */
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'ciae-back',  // apodo del proceso para poder hacer pm2 restart cia-back
      script: path.join(__dirname, 'BackEnd', 'venv', 'Scripts', 'uvicorn.exe'), // equivalente a navegar a 
      args: [
        'main:app',  
        '--host', '0.0.0.0',
        '--port', '8005',
        '--ssl-keyfile',  path.join(__dirname, 'FrontEnd', 'certs', 'key.pem'),
        '--ssl-certfile', path.join(__dirname, 'FrontEnd', 'certs', 'cert.pem'),
      ].join(' '),  //todo equivlanete a uvicorn.exe main:app --host 0.0.0.0 --port 8005 --ssl-keyfile C:\...\key.pem --ssl-certfile C:\...\cert.pem

      cwd: path.join(__dirname, 'BackEnd'),  // decirle que para ejecutar el comando de arruba lo ejecute apradoi en backend
      interpreter: 'none',  //pm2 es realizado por node, pero como ejecutamos py le ponemos none por q no es js 
      env: { PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8', AMBIENTE: 'produccion' },  //para que no haga buffering y se vea en tiempo real lo que hace el backend, y para que no haya problemas con acentos y ñ
    },
  ],
};
