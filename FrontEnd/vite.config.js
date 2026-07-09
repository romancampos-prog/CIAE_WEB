import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@auth':     path.resolve(__dirname, './src/auth'),
      '@ftp':      path.resolve(__dirname, './src/indicadores/ftp'),
      '@iass':     path.resolve(__dirname, './src/indicadores/iaas'),
      '@epi':      path.resolve(__dirname, './src/epidemiologia'),
      '@indReportes': path.resolve(__dirname, './src/indicadores/reportes'),
      '@shared':    path.resolve(__dirname, './src/shared'),
      '@indShared': path.resolve(__dirname, './src/indicadores/shared'),
      '@paginas':   path.resolve(__dirname, './src/paginas'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
    https: {
      key:  fs.readFileSync(path.resolve(__dirname, 'certs/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'certs/cert.pem')),
    },
  },
})