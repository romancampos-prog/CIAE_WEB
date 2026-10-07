import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './shared/estilos/tema.css'
import './index.css'
import AppRouter from './routes/Routes'
import { seguirTemaDelSistema } from './shared/utils/tema'

seguirTemaDelSistema()

createRoot(document.getElementById('root')).render(
  <StrictMode>
      <AppRouter/>
  </StrictMode>
)
