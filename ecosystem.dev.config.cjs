/**
 * MODO DESARROLLO — hot reload activo, no optimizado
 * Uso: pm2 start ecosystem.dev.config.cjs
 */
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'ciae-back-dev',
      script: path.join(__dirname, 'BackEnd', 'venv', 'Scripts', 'uvicorn.exe'),
      args: 'main:app --port 8005 --reload',
      cwd: path.join(__dirname, 'BackEnd'),
      interpreter: 'none',
      env: { PYTHONUNBUFFERED: '1' },
    },
    {
      name: 'ciae-front-dev',
      script: path.join(__dirname, 'FrontEnd', 'node_modules', 'vite', 'bin', 'vite.js'),
      args: '',
      cwd: path.join(__dirname, 'FrontEnd'),
    },
  ],
};
