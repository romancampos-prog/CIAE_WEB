import { useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/**
 * Interpolación lineal de color entre dos colores hex.
 * @param {string} a - Color inicial en formato `#rrggbb`
 * @param {string} b - Color final en formato `#rrggbb`
 * @param {number} t - Factor 0-1
 * @returns {string} Color interpolado en formato `rgb(r,g,b)`
 */
function lerp(a, b, t) {
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
 * @param {number} casos
 * @param {number} maxCasos
 * @returns {string}
 */
function getColor(casos, maxCasos) {
  if (!casos || casos === 0) return '#d4d4d4'
  const r = casos / maxCasos
  if (r <= 0.25) return lerp('#2e8b57', '#ccaa00', r / 0.25)
  if (r <= 0.50) return lerp('#ccaa00', '#e07b00', (r - 0.25) / 0.25)
  if (r <= 0.75) return lerp('#e07b00', '#cc0000', (r - 0.50) / 0.25)
  return '#cc0000'
}

/**
 * Hook de Leaflet que ajusta el viewport al bounding box del GeoJSON cada vez que cambia.
 * @param {{ geojsonData: object }} props
 */
function FitBounds({ geojsonData }) {
  const map = useMap()
  useEffect(() => {
    if (geojsonData?.features?.length) {
      try {
        const layer = L.geoJSON(geojsonData)
        const bounds = layer.getBounds()
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20] })
        }
      } catch {}
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
export default function MapaLeaflet({ geojson, etiqueta }) {
  if (!geojson) return null

  const maxReal = Math.max(1, ...geojson.features.map(f => f.properties.N_CASOS || 0))

  const style = (feature) => {
    const casos = feature.properties.N_CASOS || 0
    return {
      fillColor  : getColor(casos, maxReal),
      fillOpacity: casos > 0 ? 0.82 : 0.45,
      color      : 'white',
      weight     : 1.8,
      dashArray  : casos > 0 ? '' : '3',
    }
  }

  const onEachFeature = (feature, layer) => {
    const nombre = feature.properties.NOMBRE || feature.properties.MUNICIPIO
    const casos  = feature.properties.N_CASOS || 0
    layer.bindTooltip(
      `<strong>${nombre}</strong><br/>${etiqueta}: <b>${casos}</b>`,
      { sticky: true }
    )
    layer.on({
      mouseover: e => { if (casos > 0) e.target.setStyle({ fillOpacity: 1, weight: 2.5 }) },
      mouseout : e => e.target.setStyle(style(feature)),
    })
  }

  const geoKey = `${etiqueta}-${geojson.features?.length ?? 0}`

  return (
    <div style={{ overflow: 'visible' }}>
      <MapContainer
        center={[20.85, -101.0]}
        zoom={9}
        style={{ height: 480, width: '100%' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
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
