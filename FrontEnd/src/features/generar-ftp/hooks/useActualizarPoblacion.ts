// react
import { useState, type DragEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// propios
import type { AdvertenciasCarga } from '@/types/pantallas/generarFtp';
import { poblacionApi } from '@/api/indicadores/poblacionApi';
import { mensajeDeError } from '@/api/cliente/mensajeDeError';
import { CLAVE_POBLACION_ACTUAL } from './usePoblacionActual';

export const ANO_ACTIVO = '2026';

/**
 * Los dos pasos del modal de población: subir el Excel (con sus advertencias) y, después,
 * recalcular lo ya generado que depende de la población.
 */
export function useActualizarPoblacion() {
  const clienteConsultas = useQueryClient();
  const [archivo, setArchivo]           = useState<File | null>(null);
  const [dragOver, setDragOver]         = useState(false);
  const [mensaje, setMensaje]           = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [fase, setFase]                 = useState<'upload' | 'recalcular'>('upload');
  const [advertencias, setAdvertencias] = useState<AdvertenciasCarga | null>(null);
  // Mes/año detectado en el Excel subido: desde ahí se recalcula.
  const [periodo, setPeriodo]           = useState<{ mes: string; anio: number } | null>(null);

  const subida = useMutation({
    mutationFn: poblacionApi.subirArchivo,
    onMutate: () => setMensaje(null),
    onSuccess: (datos) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_POBLACION_ACTUAL });
      const { mes_detectado: mesDetectado, anio_detectado: anioDetectado } = datos;
      setPeriodo(mesDetectado && anioDetectado ? { mes: mesDetectado, anio: anioDetectado } : null);

      const celdasVacias: Record<string, string[]> = {};
      (datos.errores_datos ?? []).forEach(({ unidad, grupo, columna }) => {
        (celdasVacias[unidad] ??= []).push(`${grupo} — ${columna}`);
      });

      const noEncontradas = datos.no_encontradas ?? [];
      const extras = datos.extras ?? [];
      const alias = datos.alias_sugeridos ?? {};
      const textoPeriodo = mesDetectado && anioDetectado ? ` (${mesDetectado} ${anioDetectado})` : '';
      setMensaje({ tipo: 'exito', texto: `${datos.unidades ? `${datos.unidades} unidades` : 'Archivo'} procesado correctamente${textoPeriodo}.` });
      setAdvertencias(
        noEncontradas.length || extras.length || datos.errores_datos?.length || Object.keys(alias).length || datos.advertencia_titulo
          ? { no_encontradas: noEncontradas, extras, celdasVacias, alias_sugeridos: alias, advertenciaTitulo: datos.advertencia_titulo }
          : null
      );
      setArchivo(null);
      setFase('recalcular');
    },
    onError: (error) => setMensaje({ tipo: 'error', texto: mensajeDeError(error, 'Error al subir el archivo.') }),
  });

  const recalculo = useMutation({
    mutationFn: () => poblacionApi.recalcular(ANO_ACTIVO),
    onError: () => setMensaje({ tipo: 'error', texto: 'Error al recalcular los reportes.' }),
  });

  const elegirArchivo = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setMensaje({ tipo: 'error', texto: 'Solo se aceptan archivos Excel (.xlsx, .xls)' });
      return;
    }
    setMensaje(null);
    setArchivo(file);
  };

  const soltarArchivo = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    elegirArchivo(e.dataTransfer.files[0]);
  };

  const resultado = recalculo.data
    ? { total: recalculo.data.total ?? 0, errores: recalculo.data.errores ?? [], cortesExtractor: recalculo.data.cortes_extractor ?? [] }
    : null;

  return {
    archivo, elegirArchivo, quitarArchivo: () => setArchivo(null),
    dragOver, setDragOver, soltarArchivo,
    mensaje, fase, advertencias, periodo, resultado,
    cargando: subida.isPending || recalculo.isPending,
    subir: () => archivo && subida.mutate(archivo),
    recalcular: () => recalculo.mutate(),
  };
}
