import { useState, useEffect } from 'react'

export function useDengueReporte(fetchFn, deps = []) {
  const [datos,    setDatos]    = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    let activo = true
    setCargando(true)
    setError(null)
    fetchFn()
      .then(({ data }) => { if (activo) setDatos(data) })
      .catch((err) => {
        if (activo) {
          setError(
            err.response?.status === 404
              ? 'Sin datos — ejecuta el pipeline primero'
              : (err.response?.data?.detail || 'Error al cargar datos')
          )
        }
      })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, deps)

  return { datos, cargando, error }
}
