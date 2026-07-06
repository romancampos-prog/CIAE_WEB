import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@auth':     path.resolve(__dirname, './src/auth'),
      '@ftp':      path.resolve(__dirname, './src/indicadores_FTP'),
      '@inass':    path.resolve(__dirname, './src/indicadores_IN_ASS'),
      '@epi':      path.resolve(__dirname, './src/epidemiologia'),
      '@reportes': path.resolve(__dirname, './src/reportes'),
      '@shared':   path.resolve(__dirname, './src/shared'),
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