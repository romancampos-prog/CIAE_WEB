// react
import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
// propios
import type { VistaGrafica } from '@/types/pantallas/graficas';
import { excelApi } from '@/api/indicadores/excelApi';
import { reportesApi } from '@/api/indicadores/reportesApi';
import { descargarB64 } from '@/features/indicadores';
import { CLAVE_ESTATAL, ordenarMeses } from '@/features/graficas/utils/datosGrafica';
import { anioDelMesAnterior } from '@/utils/anios';

const ANIO = String(anioDelMesAnterior());

/** Lo que el usuario eligió para UN indicador: al cambiar de indicador se vuelve a lo de por defecto. */
interface EleccionDelIndicador {
  indicador: string;
  mes?: string;
  acumulado?: boolean;
}

/**
 * Detalle de la página de gráficas: los datos de un indicador (ficha, reporte, estadísticas y
 * perfil en una sola llamada, guardada mientras se está en gráficas) y lo que el usuario eligió:
 * el mes de toda la página, la pestaña, la unidad de la tendencia y el acumulado.
 * @param indicador     indicador elegido
 * @param indsHermanos  los de la misma familia, para "descargar todos"
 */
export function useGraficaIndicador(indicador: string, indsHermanos: string[]) {
  const [eleccion, setEleccion]     = useState<EleccionDelIndicador>({ indicador });
  const [vista, setVista]           = useState<VistaGrafica>('comparar');
  const [unidadElegida, setUnidadSel] = useState(CLAVE_ESTATAL);

  const consulta = useQuery({
    queryKey: ['graficas', 'detalle', indicador, ANIO],
    queryFn: () => reportesApi.obtenerGrafica(indicador, ANIO),
    enabled: !!indicador,
    // Regresar a un indicador ya visto no lo vuelve a pedir (la página borra todo al salir).
    staleTime: Infinity,
    // Mientras llega el nuevo se sigue viendo el anterior, así la página no parpadea.
    placeholderData: keepPreviousData,
  });

  const descarga = useMutation({
    mutationFn: (indicadores: string[]) => excelApi.descargar(indicadores, ANIO),
    onSuccess: (excel) => descargarB64(excel.archivo_b64, excel.nombre_archivo),
  });

  const datos        = consulta.data ?? null;
  const reporte      = datos?.reporte ?? null;
  const estadisticas = datos?.estadisticas ?? null;
  const resumenes    = estadisticas?.resumenPorMes ?? [];
  const delIndicador = eleccion.indicador === indicador ? eleccion : { indicador };

  // Meses del selector: los cerrados y, al final, el del semanal si todavía no cierra.
  const mesesCerrados = resumenes.map(r => r.mes);
  const mesSemanal    = Object.keys(reporte?.SEMANA?.MES ?? {})[0] ?? null;
  const mesParcial    = mesSemanal && !mesesCerrados.includes(mesSemanal) ? mesSemanal : null;
  const meses         = ordenarMeses(mesParcial ? [...mesesCerrados, mesParcial] : mesesCerrados);

  // Arranca en el último mes cerrado (el que tiene resumen); si no hay, en el parcial.
  const mesSel = delIndicador.mes ?? mesesCerrados[mesesCerrados.length - 1] ?? mesSemanal ?? '';

  // La unidad de la tendencia se conserva entre indicadores si también existe en este; si no, el
  // estatal. El usuario de unidad no recibe el estatal: entonces la única unidad que trae.
  const unidades  = Object.values(reporte?.MESES ?? {}).flatMap(m => Object.keys(m.Reporte ?? {}));
  const respaldo  = unidades.includes(CLAVE_ESTATAL) ? CLAVE_ESTATAL : (unidades[0] ?? CLAVE_ESTATAL);
  const unidadSel = unidades.includes(unidadElegida) ? unidadElegida : respaldo;

  const indiceResumen = resumenes.findIndex(r => r.mes === mesSel);
  const resumen       = indiceResumen >= 0 ? resumenes[indiceResumen] : null;
  const mesAnterior   = indiceResumen > 0 ? resumenes[indiceResumen - 1].mes : null;

  const elegir = (cambios: Omit<EleccionDelIndicador, 'indicador'>) =>
    setEleccion(previa => ({ ...(previa.indicador === indicador ? previa : { indicador }), ...cambios }));

  const descargar = (indicadores: string[]) => {
    if (descarga.isPending || !indicadores.length) return;
    descarga.mutate(indicadores);
  };

  return {
    anio: ANIO,
    cargando: consulta.isFetching,
    descargando: descarga.isPending,
    ficha: datos?.ficha ?? null,
    perfil: datos?.perfil ?? null,
    reporte, estadisticas,
    meses, mesParcial, mesSel,
    setMesSel: (mes: string) => elegir({ mes }),
    resumen, mesAnterior,
    vista, setVista,
    unidadSel, setUnidadSel,
    acumulado: delIndicador.acumulado ?? false,
    setAcumulado: (acumulado: boolean) => elegir({ acumulado }),
    tieneAcumulado: Object.keys(reporte?.MENSUAL_ACUMULADO ?? {}).length > 0,
    descargarIndicador: () => descargar([indicador]),
    descargarFamilia: () => descargar(indsHermanos),
  };
}
