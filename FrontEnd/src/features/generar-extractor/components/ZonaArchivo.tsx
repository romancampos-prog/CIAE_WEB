// react
import { useState, type DragEvent } from 'react';
// propios
import { IconoDocumento, IconoSubirNube } from '@/components/icons';

const EXTENSIONES_EXCEL = ['.xlsx', '.xls'];
const esExcel = (archivo: File) => EXTENSIONES_EXCEL.some(ext => archivo.name.toLowerCase().endsWith(ext));

interface Props {
  sugerido: string;
  archivo: File | null;
  onSeleccionar: (archivo: File | null) => void;
}

/** Zona para soltar o elegir el Excel del mes; rechaza lo que no sea Excel. */
const ZonaArchivo = ({ sugerido, archivo, onSeleccionar }: Props) => {
  const [arrastrando, setArrastrando] = useState(false);
  const [rechazado, setRechazado] = useState('');

  // El input filtra por extensión, pero al arrastrar puede llegar cualquier archivo.
  const elegir = (file: File | undefined) => {
    if (!file) return;
    if (!esExcel(file)) {
      setRechazado(`"${file.name}" no es un Excel. Solo se aceptan archivos .xlsx o .xls.`);
      return;
    }
    setRechazado('');
    onSeleccionar(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
    elegir(e.dataTransfer.files?.[0]);
  };

  if (archivo) {
    return (
      <div className="ex-dz-seleccionado">
        <IconoDocumento />
        <span className="ex-dz-nombre">{archivo.name}</span>
        <button type="button" className="ex-dz-quitar" onClick={() => onSeleccionar(null)}>Quitar</button>
      </div>
    );
  }
  return (
    <>
      <div
        className={`ex-dz-area${arrastrando ? ' ex-dz-area--activo' : ''}`}
        onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={onDrop}
      >
        <input type="file" accept={EXTENSIONES_EXCEL.join(',')} onChange={e => { elegir(e.target.files?.[0]); e.target.value = ''; }} />
        <IconoSubirNube />
        <p className="ex-dz-texto">Arrastra o <span>selecciona</span> el archivo</p>
        <p className="exv-dz-formato">Solo archivos Excel (.xlsx o .xls)</p>
        <p className="ex-dz-sugerido">Ejemplo: {sugerido} · el nombre puede ser otro</p>
      </div>
      {rechazado && <p className="ex-error">{rechazado}</p>}
    </>
  );
};

export default ZonaArchivo;
