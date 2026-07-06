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
      name: 'ciae-back',
      script: path.join(__dirname, 'BackEnd', 'venv', 'Scripts', 'uvicorn.exe'),
      args: [
        'main:app',
        '--host', '0.0.0.0',
        '--port', '8005',
        '--ssl-keyfile',  path.join(__dirname, 'FrontEnd', 'certs', 'key.pem'),
        '--ssl-certfile', path.join(__dirname, 'FrontEnd', 'certs', 'cert.pem'),
      ].join(' '),
      cwd: path.join(__dirname, 'BackEnd'),
      interpreter: 'none',
      env: { PYTHONUNBUFFERED: '1' },
    },
  ],
};
