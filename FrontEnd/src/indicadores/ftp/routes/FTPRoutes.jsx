// react
import { Routes, Route } from 'react-router-dom'
// propios
import FTPMenu    from '../paginas/FTPLanding'
import FTPGenerar from '../paginas/IndicadoresPage'

export default function FTPRoutes() {
  return (
    <Routes>
      <Route index         element={<FTPMenu />} />
      <Route path="Generar" element={<FTPGenerar />} />
    </Routes>
  )
}
