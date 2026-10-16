// El mes de los KPIs: el que se eligió en "Por mes" si ya está cerrado; si no (o en "Por unidad"),
// el último mes cerrado que mandó el backend.
export const resumenDelMes = (resumenPorMes = [], mesNombre = null) => {
  const elegido = resumenPorMes.findIndex(r => r.mes === mesNombre);
  const indice = elegido >= 0 ? elegido : resumenPorMes.length - 1;
  return {
    resumen: resumenPorMes[indice] ?? null,
    mesAnterior: indice > 0 ? resumenPorMes[indice - 1].mes : null,
  };
};
