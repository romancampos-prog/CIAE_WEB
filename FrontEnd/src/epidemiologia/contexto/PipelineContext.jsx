import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { getEstado, ejecutar as apiEjecutar } from '../api/pipeline'

const PipelineContext = createContext(null)

export function PipelineProvider({ children }) {
  const [estado,     setEstado]     = useState(null)
  const [refetchKey, setRefetchKey] = useState(0)
  const intervalRef    = useRef(null)
  const yaCompletadoRef = useRef(false)

  const detenerPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const fetchEstado = useCallback(async () => {
    try {
      const { data: res } = await getEstado()
      const estado = res.data          // extrae el objeto interno del ApiResponse
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

export function usePipeline() {
  return useContext(PipelineContext)
}
