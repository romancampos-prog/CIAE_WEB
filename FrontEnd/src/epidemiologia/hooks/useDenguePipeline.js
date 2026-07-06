import { useState, useEffect, useRef } from 'react'
import { getEstado, ejecutar as apiEjecutar } from '../api/pipeline'

export function useDenguePipeline() {
  const [estado, setEstado]     = useState(null)
  const [cargando, setCargando] = useState(false)
  const intervalRef = useRef(null)

  const fetchEstado = async () => {
    try {
      const { data } = await getEstado()
      setEstado(data)
      if (!data.corriendo) detenerPolling()
    } catch {}
  }

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
