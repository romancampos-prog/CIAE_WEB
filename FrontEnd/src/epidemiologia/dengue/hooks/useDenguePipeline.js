import { useState, useEffect, useRef } from 'react'
import { getEstado, ejecutar as apiEjecutar } from '../api/pipeline'

/**
 * Hook para controlar el pipeline de análisis de dengue desde una página independiente.
 * Realiza polling cada 2 s mientras el pipeline está corriendo y lo detiene al terminar.
 * @returns {{ estado: Object|null, cargando: boolean, ejecutar: Function, fetchEstado: Function }}
 */
export function useDenguePipeline() {
  const [estado, setEstado]     = useState(null)
  const [cargando, setCargando] = useState(false)
  const intervalRef = useRef(null)

  /** Consulta el estado del pipeline y detiene el polling si ya no está corriendo */
  const fetchEstado = async () => {
    try {
      const { data } = await getEstado()
      setEstado(data)
      if (!data.corriendo) detenerPolling()
    } catch {}
  }

  /** Cancela el intervalo de polling activo */
  const detenerPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    fetchEstado()
    return detenerPolling
  }, [])

  /**
   * Inicia la ejecución del pipeline y activa el polling de estado.
   * Muestra un alert si el servidor responde con error.
   */
  const ejecutar = async () => {
    try {
      setCargando(true)
      await apiEjecutar()
      setEstado(prev => ({ ...prev, corriendo: true, paso: 'Iniciando...' }))
      intervalRef.current = setInterval(fetchEstado, 2000)
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al iniciar el pipeline')
    } finally {
      setCargando(false)
    }
  }

  return { estado, cargando, ejecutar, fetchEstado }
}
