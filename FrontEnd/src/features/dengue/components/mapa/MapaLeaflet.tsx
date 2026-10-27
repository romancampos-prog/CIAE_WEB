// react
import { useEffect } from 'react'
import { MapContainer, GeoJSON, useMap } from 'react-leaflet'
import L, { type LeafletMouseEvent, type Layer, type Path } from 'leaflet'
import type { Feature, Geometry } from 'geojson'
import 'leaflet/dist/leaflet.css'
// propios
import type { DatosMapa, PropiedadesMunicipio } from '@/types/api/dengue/reportes';
import useTema from '@/hooks/useTema';

type Municipio = Feature<Geometry, PropiedadesMunicipio>;

/**
 * Interpolación lineal de color entre dos colores hex.
 * a y b en formato `#rrggbb`, t entre 0 y 1; regresa `rgb(r,g,b)`.
 */
function lerp(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16)
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `rgb(${r},${g},${bl})`
}

/**
 * Devuelve un color según la razón `casos/maxCasos`, usando el gradiente del canal endémico.
 * Sin casos → gris neutro.
 */
function getColor(casos: number, maxCasos: number, esOscuro: boolean): string {
  if (!casos || casos === 0) return esOscuro ? '#3b524e' : '#d4d4d4'
  const r = casos / maxCasos
  if (r <= 0.25) return lerp('#2e8b57', '#ccaa00', r / 0.25)
  if (r <= 0.50) return lerp('#ccaa00', '#e07b00', (r - 0.25) / 0.25)
  if (r <= 0.75) return lerp('#e07b00', '#cc0000', (r - 0.50) / 0.25)
  return '#cc0000'
}

/**
 * Hook de Leaflet que ajusta el viewport al bounding box del GeoJSON cada vez que cambia.
 */
function FitBounds({ geojsonData }: { geojsonData: DatosMapa['geojson'] }) {
  const map = useMap()
  useEffect(() => {
    if (geojsonData?.features?.length) {
      try {
        const layer = L.geoJSON(geojsonData)
        const bounds = layer.getBounds()
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20] })
        }
      } catch {
        // GeoJSON sin geometría válida: se queda la vista inicial del estado.
      }
    }
  }, [geojsonData, map])
  return null
}

/**
 * Llama a `invalidateSize` a los 100 ms y a los 800 ms del montaje para compensar
 * la animación de entrada de la página que hace que Leaflet calcule el tamaño incorrectamente.
 */
function InvalidateOnMount() {
  const map = useMap()
  useEffect(() => {
    // La animación .epi-mainIn dura 700ms (0.6s + 0.1s delay);
    // invalidateSize antes de eso hace que Leaflet calcule tamaño mal.
    const t1 = setTimeout(() => map.invalidateSize(), 100)
    const t2 = setTimeout(() => map.invalidateSize(), 800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [map])
  return null
}

/**
 * Mapa Leaflet con municipios de Guanajuato coloreados por número de casos.
 * Usa CartoDB como capa base y calcula el gradiente respecto al municipio con más casos.
 * @param {{ geojson: object|null, etiqueta: string }} props  etiqueta se muestra en el tooltip del municipio
 */
export default function MapaLeaflet({ geojson, etiqueta }: { geojson: DatosMapa['geojson'] | undefined; etiqueta: string }) {
  const { tema, esOscuro } = useTema()
  if (!geojson) return null

  const maxReal = Math.max(1, ...geojson.features.map(f => f.properties.N_CASOS || 0))

  const style = (feature?: Municipio) => {
    const casos = feature?.properties.N_CASOS || 0
    return {
      fillColor  : getColor(casos, maxReal, esOscuro),
      fillOpacity: casos > 0 ? 0.82 : 0.45,
      // Contorno del color del fondo: separa municipios sin rayas blancas en oscuro
      color      : esOscuro ? '#0d1a19' : 'white',
      weight     : 1.8,
      dashArray  : casos > 0 ? '' : '3',
    }
  }

  const onEachFeature = (feature: Municipio, layer: Layer) => {
    const nombre = feature.properties.NOMBRE || feature.properties.MUNICIPIO
    const casos  = feature.properties.N_CASOS || 0
    layer.bindTooltip(
      `<strong>${nombre}</strong><br/>${etiqueta}: <b>${casos}</b>`,
      { sticky: true }
    )
    layer.on({
      mouseover: (e: LeafletMouseEvent) => { if (casos > 0) (e.target as Path).setStyle({ fillOpacity: 1, weight: 2.5 }) },
      mouseout : (e: LeafletMouseEvent) => (e.target as Path).setStyle(style(feature)),
    })
  }

  // El tema va en la key: los handlers de hover guardan el estilo con el que se
  // crearon, así que al alternar tema se vuelve a montar la capa.
  const geoKey = `${etiqueta}-${geojson.features?.length ?? 0}-${tema}`

  return (
    <div style={{ overflow: 'visible' }}>
      {/* Sin mapa base externo: CARTO empezó a exigir API key y pintaba "API KEY REQUIRED"
          sobre el fondo; el GeoJSON ya dibuja todo el estado. */}
      <MapContainer
        center={[20.85, -101.0]}
        zoom={9}
        style={{ height: 480, width: '100%', background: 'var(--superficie-suave)' }}
        attributionControl={false}
      >
        <GeoJSON
          key={geoKey}
          data={geojson}
          style={style}
          onEachFeature={onEachFeature}
        />
        <FitBounds geojsonData={geojson} />
        <InvalidateOnMount />
      </MapContainer>
    </div>
  )
}
