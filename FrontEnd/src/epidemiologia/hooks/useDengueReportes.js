import { useState, useEffect } from 'react'
import { usePipeline } from '../contexto/PipelineContext'

/**
 * Hook genérico para cargar un reporte de dengue desde la API.
 * Se re-ejecuta automáticamente cuando el pipeline completa un nuevo análisis
 * (detectado a través del `refetchKey` del PipelineContext).
 *
 * @param {Function} fetchFn - Función que devuelve una promesa Axios con los datos del reporte
 * @param {Array} [deps=[]] - Dependencias adicionales que provocan una nueva carga (ej. parámetros de ruta)
 * @returns {{ datos: any, cargando: boolean, error: string|null }}
 */
export function useDengueReporte(fetchFn, deps = []) {
  const { refetchKey = 0 } = usePipeline() || {}
  const [datos,    setDatos]    = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    let activo = true
    setCargando(true)
    setError(null)
    fetchFn()
      .then(({ data }) => { if (activo) { setDatos(data); setError(null) } })
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
  }, [...deps, refetchKey])

  return { datos, cargando, error }
}
