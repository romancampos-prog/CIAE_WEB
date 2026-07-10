import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { getEstado, ejecutar as apiEjecutar } from '../api/pipeline'

const PipelineContext = createContext(null)

/**
 * Proveedor del contexto del pipeline de dengue.
 * Mantiene el estado global del pipeline (corriendo, completado, error, último reporte),
 * hace polling automático mientras está activo y emite `refetchKey` para que los reportes
 * se recarguen al completarse un nuevo análisis.
 *
 * @param {{ children: React.ReactNode }} props
 */
export function PipelineProvider({ children }) {
  const [estado,     setEstado]     = useState(null)
  const [refetchKey, setRefetchKey] = useState(0)
  const intervalRef     = useRef(null)
  const yaCompletadoRef = useRef(false)

  /** Cancela el intervalo de polling activo */
  const detenerPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  /**
   * Consulta el estado del pipeline.
   * Si acaba de completarse por primera vez en esta sesión, incrementa `refetchKey`
   * para notificar a los hooks de reporte que recarguen sus datos.
   */
  const fetchEstado = useCallback(async () => {
    try {
      const { data: res } = await getEstado()
      const estado = res.data
      setEstado(estado)

      if (estado.completado && !yaCompletadoRef.current) {
        yaCompletadoRef.current = true
        setRefetchKey(k => k + 1)
      }

      if (!estado.corriendo) detenerPolling()
    } catch (err) {
      console.error('[Pipeline] error al obtener estado:', err)
    }
  }, [])

  useEffect(() => {
    fetchEstado()
    return detenerPolling
  }, [])

  /**
   * Inicia la ejecución del pipeline completo.
   * Resetea el flag de completado y activa el polling para actualizar el estado.
   */
  const ejecutar = async () => {
    try {
      await apiEjecutar()
      yaCompletadoRef.current = false
      setEstado(prev => ({ ...prev, corriendo: true, completado: false, error: null, paso: 'Iniciando...' }))
      intervalRef.current = setInterval(fetchEstado, 2000)
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al iniciar el pipeline')
    }
  }

  return (
    <PipelineContext.Provider value={{ estado, refetchKey, ejecutar }}>
      {children}
    </PipelineContext.Provider>
  )
}

/**
 * Accede al contexto del pipeline desde cualquier componente hijo de PipelineProvider.
 * @returns {{ estado: Object|null, refetchKey: number, ejecutar: Function }}
 */
export function usePipeline() {
  return useContext(PipelineContext)
}
