// react
import { useState } from 'react';
// propios
import { mensajeDeError } from '@/api/mensajeDeError';
import { iaasService } from '@/features/generar-iaas/services/iaasService';
import type { SesionIaas } from '@/features/generar-iaas/tipos';

const INDICADOR_CON_EXCEL_GLOBAL = 'IAAS 01';

const esExcel = (archivo: File | undefined): archivo is File => !!archivo?.name.endsWith('.xlsx');

interface Opciones {
  anio: string;
  mes: string;
  /** Todos los indicadores IAAS (del backend). */
  todosIndicadores: string[];
  sesion: SesionIaas | null;
  alTerminar: () => void;
  onClose: () => void;
}

/**
 * Completar una unidad que entregó fuera de tiempo: qué indicadores se editan, los denominadores
 * (o "sin dato"), los Excel que hacen falta según lo que ya está guardado, y el envío con contraseña.
 * El modal se monta al abrirse, así que cada apertura arranca limpia.
 */
export function useUnidadTardia({ anio, mes, todosIndicadores, sesion, alTerminar, onClose }: Opciones) {
  const unidadesPendientes     = sesion?.unidades_pendientes ?? [];
  const indicadoresPendientes  = sesion?.indicadores_pendientes ?? {};
  const denominadoresGuardados = sesion?.denominadores_guardados ?? {};
  const numeradoresGuardados   = sesion?.numeradores_guardados ?? {};
  const conDenominadorCapturado = todosIndicadores.filter(i => i !== INDICADOR_CON_EXCEL_GLOBAL);

  const denominadoresParaUnidad = (u: string): Record<string, string> => {
    const guardados = denominadoresGuardados[u] || {};
    return Object.fromEntries(conDenominadorCapturado.map(i => [i, guardados[i] != null ? String(guardados[i]) : '']));
  };

  const primeraPendiente = unidadesPendientes[0] || '';
  const [unidad, setUnidad]             = useState(primeraPendiente);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [excelUnidad, setExcelUnidad]   = useState<File | null>(null);
  const [excelDenIaas01, setExcelDenIaas01] = useState<File | null>(null);
  const [denoms, setDenoms]             = useState<Record<string, string>>(() => (primeraPendiente ? denominadoresParaUnidad(primeraPendiente) : {}));
  const [sinDato, setSinDato]           = useState<Set<string>>(new Set());
  // Lo que había antes de marcar "sin dato", para regresarlo al desmarcar.
  const [denomsRespaldo, setDenomsRespaldo] = useState<Record<string, string>>({});
  const [enviando, setEnviando]         = useState(false);
  const [error, setError]               = useState('');
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [errorPassword, setErrorPassword] = useState('');

  const elegirUnidad = (u: string) => {
    setUnidad(u);
    setSeleccionados(new Set());
    setDenoms(denominadoresParaUnidad(u));
    setSinDato(new Set());
    setDenomsRespaldo({});
    setExcelUnidad(null);
    setExcelDenIaas01(null);
    setError('');
  };

  const alternarIndicador = (ind: string) => setSeleccionados(previos => {
    const s = new Set(previos);
    if (s.has(ind)) s.delete(ind);
    else s.add(ind);
    return s;
  });

  /** Marca/desmarca "sin dato": al marcar guarda el valor y lo borra; al desmarcar lo regresa. */
  const alternarSinDato = (ind: string) => {
    const s = new Set(sinDato);
    if (s.has(ind)) {
      s.delete(ind);
      setDenoms(p => ({ ...p, [ind]: denomsRespaldo[ind] ?? '' }));
    } else {
      s.add(ind);
      setDenomsRespaldo(r => ({ ...r, [ind]: denoms[ind] ?? '' }));
      setDenoms(p => ({ ...p, [ind]: '' }));
    }
    setSinDato(s);
  };

  // Los indicadores elegidos que no tienen numerador guardado necesitan el Excel de la unidad.
  const indicadoresSinNumerador = unidad ? [...seleccionados].filter(i => numeradoresGuardados[unidad]?.[i] == null) : [];
  const excelRequerido = indicadoresSinNumerador.length > 0;
  const iaas01Elegido  = seleccionados.has(INDICADOR_CON_EXCEL_GLOBAL);
  const excelDenRequerido = !!unidad && iaas01Elegido && denominadoresGuardados[unidad]?.[INDICADOR_CON_EXCEL_GLOBAL] == null;

  const formularioValido = (): boolean => {
    if (!unidad)                { setError('Selecciona una unidad.'); return false; }
    if (seleccionados.size === 0) { setError('Selecciona al menos un indicador.'); return false; }
    if (excelRequerido && !excelUnidad) {
      setError(`Sube el Excel — falta numerador para: ${indicadoresSinNumerador.join(', ')}`);
      return false;
    }
    if (excelDenRequerido && !excelDenIaas01) {
      setError('Sube el Excel del denominador de IAAS 01 para esta unidad.');
      return false;
    }
    const sinDenominador = [...seleccionados]
      .filter(i => i !== INDICADOR_CON_EXCEL_GLOBAL)
      .filter(i => !sinDato.has(i) && (denoms[i] == null || denoms[i] === ''));
    if (sinDenominador.length) { setError(`Captura el denominador para: ${sinDenominador.join(', ')} (o marca "Sin dato")`); return false; }
    return true;
  };

  const confirmar = () => {
    if (!formularioValido()) return;
    setError('');
    setErrorPassword('');
    setMostrarConfirmar(true);
  };

  const enviar = async (password: string) => {
    if (!password) { setErrorPassword('Ingresa tu contraseña.'); return; }
    setEnviando(true);
    setErrorPassword('');
    try {
      const denominadores = Object.fromEntries([...seleccionados]
        .filter(i => i !== INDICADOR_CON_EXCEL_GLOBAL)
        .map(i => [i, sinDato.has(i) ? null : denoms[i]]));
      const res = await iaasService.completarUnidadTardia({
        anio, mes, unidad, indicadores: [...seleccionados], denominadores,
        excelUnidad, excelDenominadorIaas01: excelDenIaas01, password,
      });
      if (res.success) { alTerminar(); onClose(); }
      else setErrorPassword(res.message || 'Error al actualizar.');
    } catch (e) {
      const detalle = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setErrorPassword(Array.isArray(detalle) ? detalle.join('\n') : mensajeDeError(e, 'Error al actualizar.'));
    } finally {
      setEnviando(false);
    }
  };

  return {
    unidad, elegirUnidad,
    unidadesPendientes,
    // Las que no están pendientes también se pueden corregir.
    otrasUnidades: (todas: string[]) => todas.filter(u => !unidadesPendientes.includes(u)),
    indicadoresDeUnidad: (u: string) => indicadoresPendientes[u] || todosIndicadores,
    seleccionados, alternarIndicador,
    denoms, capturarDenominador: (ind: string, valor: string) => setDenoms(p => ({ ...p, [ind]: valor })),
    sinDato, alternarSinDato,
    numeradorGuardado: (ind: string) => (unidad ? numeradoresGuardados[unidad]?.[ind] : undefined),
    denominadorGuardado: (ind: string) => (unidad ? denominadoresGuardados[unidad]?.[ind] : undefined),
    excelUnidad, elegirExcelUnidad: (f: File | undefined) => { if (esExcel(f)) setExcelUnidad(f); }, quitarExcelUnidad: () => setExcelUnidad(null),
    excelDenIaas01, elegirExcelDenIaas01: (f: File | undefined) => { if (esExcel(f)) setExcelDenIaas01(f); }, quitarExcelDenIaas01: () => setExcelDenIaas01(null),
    excelRequerido, excelDenRequerido, iaas01Elegido,
    error, confirmar,
    mostrarConfirmar, cerrarConfirmar: () => !enviando && setMostrarConfirmar(false),
    enviar, enviando, errorPassword,
  };
}
