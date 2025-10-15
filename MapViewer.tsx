'use client'

import { useEffect, useRef, useState } from 'react'
import { fromUrl } from 'geotiff'
import OLMap from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import ImageLayer from 'ol/layer/Image'
import ImageStatic from 'ol/source/ImageStatic'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Draw, Modify, Snap } from 'ol/interaction'
import { GeoJSON } from 'ol/format'
import { getCenter } from 'ol/extent'

interface MapViewerProps {
  imageUrl: string | null
  onAnnotationChange?: (annotations: any[]) => void
}

export default function MapViewer({ imageUrl, onAnnotationChange }: MapViewerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<OLMap | null>(null)
  const [spectralBand, setSpectralBand] = useState<'rgb' | 'infrared' | 'ndvi'>('rgb')
  const [drawMode, setDrawMode] = useState<'bbox' | 'polygon' | 'point' | null>(null)
  const [vectorSource, setVectorSource] = useState<VectorSource | null>(null)

  useEffect(() => {
    if (!mapRef.current) return

    const initialMap = new OLMap({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: [0, 0],
        zoom: 2,
      }),
    })

    const vectorSrc = new VectorSource()
    const vectorLayer = new VectorLayer({
      source: vectorSrc,
    })

    initialMap.addLayer(vectorLayer)
    setVectorSource(vectorSrc)
    setMap(initialMap)

    return () => {
      initialMap.dispose()
    }
  }, [])

  useEffect(() => {
    if (!map || !imageUrl) return

    const loadGeoTIFF = async () => {
      try {
        const tiff = await fromUrl(imageUrl)
        const image = await tiff.getImage()
        const width = image.getWidth()
        const height = image.getHeight()

        // For now, create a static extent (this would need proper geo-referencing)
        const extent = [0, 0, width, height]

        // Create canvas for rendering
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const rgba = await image.readRasters({ interleave: true })
        const dataArray = Array.isArray(rgba) ? rgba[0] : rgba
        const dataView = new Uint8ClampedArray(dataArray as any)
        const imageData = new ImageData(dataView, width, height)
        ctx.putImageData(imageData, 0, 0)

        const imageLayer = new ImageLayer({
          source: new ImageStatic({
            url: canvas.toDataURL(),
            imageExtent: extent,
          }),
        })

        // Remove existing image layers
        map.getLayers().getArray().forEach(layer => {
          if (layer instanceof ImageLayer) {
            map.removeLayer(layer)
          }
        })

        map.addLayer(imageLayer)
        map.getView().fit(extent, { padding: [20, 20, 20, 20] })
      } catch (error) {
        console.error('Error loading GeoTIFF:', error)
      }
    }

    loadGeoTIFF()
  }, [map, imageUrl])

  useEffect(() => {
    if (!map || !vectorSource || !drawMode) return

    const draw = new Draw({
      source: vectorSource,
      type: drawMode === 'bbox' ? 'Circle' : drawMode === 'polygon' ? 'Polygon' : 'Point',
    })

    map.addInteraction(draw)

    draw.on('drawend', (event) => {
      const feature = event.feature
      const geometry = feature.getGeometry()
      if (!geometry) return

      const geoJson = new GeoJSON().writeGeometryObject(geometry)

      // Add annotation data
      feature.setProperties({
        type: drawMode,
        label: 'Object',
        timestamp: new Date().toISOString(),
      })

      // Notify parent component
      onAnnotationChange?.(vectorSource.getFeatures().map(f => {
        const geom = f.getGeometry()
        if (!geom) return null
        return {
          id: f.getId(),
          type: f.get('type'),
          label: f.get('label'),
          geometry: new GeoJSON().writeGeometryObject(geom),
        }
      }).filter(Boolean))

      // Reset draw mode after drawing
      setDrawMode(null)
      map.removeInteraction(draw)
    })

    return () => {
      map.removeInteraction(draw)
    }
  }, [map, vectorSource, drawMode, onAnnotationChange])

  const handleBandChange = (band: 'rgb' | 'infrared' | 'ndvi') => {
    setSpectralBand(band)
    // TODO: Implement spectral band rendering
    // This would require processing the GeoTIFF data to show different bands
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Spectral Band Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Band:</span>
            <select
              value={spectralBand}
              onChange={(e) => handleBandChange(e.target.value as 'rgb' | 'infrared' | 'ndvi')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="rgb">RGB</option>
              <option value="infrared">Infrared</option>
              <option value="ndvi">NDVI</option>
            </select>
          </div>

          {/* Drawing Tools */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setDrawMode('bbox')}
              className={`px-3 py-1 rounded-md text-sm ${
                drawMode === 'bbox' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Bounding Box
            </button>
            <button
              onClick={() => setDrawMode('polygon')}
              className={`px-3 py-1 rounded-md text-sm ${
                drawMode === 'polygon' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Polygon
            </button>
            <button
              onClick={() => setDrawMode('point')}
              className={`px-3 py-1 rounded-md text-sm ${
                drawMode === 'point' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Point
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          {drawMode ? `Drawing: ${drawMode}` : 'Select a drawing tool'}
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapRef} className="flex-1 bg-gray-100" />
    </div>
  )
}