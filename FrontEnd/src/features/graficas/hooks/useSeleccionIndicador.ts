// react
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
// propios
import { indicadoresService, urlIcono } from '@/features/indicadores';

const COLOR_POR_DEFECTO = '#0b5445';

export interface GrupoIndicadores {
  cat: string;
  color: string;
  icono: string | null;
  inds: string[];
}

/**
 * Maestro de la página de gráficas: la lista de familias (una sola vez), el indicador elegido
 * y el drawer. El color, ícono y hermanos del elegido salen de su familia (vienen del backend).
 */
export function useSeleccionIndicador() {
  const clienteConsultas = useQueryClient();
  const [elegido, setElegido] = useState<string | null>(null);
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  const lista = useQuery({
    queryKey: ['graficas', 'indicadores'],
    queryFn: () => indicadoresService.listarFamilias(),
  });

  // Lo consultado solo vale mientras se está en gráficas: al salir se olvida, para no
  // mostrar datos viejos si mientras tanto alguien generó algo nuevo.
  useEffect(() => () => clienteConsultas.removeQueries({ queryKey: ['graficas'] }), [clienteConsultas]);

  useEffect(() => { document.title = 'Gráficas | CIAE'; }, []);

  // El índice ya viene unificado del backend (FTP, IAAS y Extractor, cada familia con su color).
  const grupos = useMemo<GrupoIndicadores[]>(() => (lista.data ?? []).map(({ categoriaIndicador, indicadores, color, imagen }) => ({
    cat: categoriaIndicador, color: color || COLOR_POR_DEFECTO, icono: urlIcono(imagen), inds: indicadores ?? [],
  })), [lista.data]);

  // Mientras el usuario no elija, se muestra el primero de la lista.
  const indicador = elegido ?? grupos[0]?.inds[0] ?? '';
  const grupo = grupos.find(({ inds }) => inds.includes(indicador)) ?? null;

  const seleccionar = (ind: string) => {
    setElegido(ind);
    setDrawerAbierto(false);
  };

  return {
    grupos,
    indicador,
    seleccionar,
    categoria: grupo?.cat ?? null,
    color: grupo?.color ?? COLOR_POR_DEFECTO,
    icono: grupo?.icono ?? null,
    hermanos: grupo?.inds ?? [],
    drawerAbierto,
    abrirDrawer: () => setDrawerAbierto(true),
    cerrarDrawer: () => setDrawerAbierto(false),
  };
}
