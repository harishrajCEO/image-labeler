'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, ZoomIn, ZoomOut, RotateCcw, Globe, Layers, Square, Hexagon } from 'lucide-react';
import 'ol/ol.css';
import OLMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import ImageLayer from 'ol/layer/Image';
import ImageStatic from 'ol/source/ImageStatic';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Draw, Modify, Snap } from 'ol/interaction';
import { GeoJSON } from 'ol/format';
import { fromLonLat, toLonLat } from 'ol/proj';
import { getCenter } from 'ol/extent';

interface Label {
  id: string;
  type: 'bbox' | 'polygon';
  label: string;
  coordinates: number[][][] | number[][]; // [x,y] for bbox, [[[x,y]]] for polygon
  confidence?: number;
  visible?: boolean;
}

interface ImageViewerProps {
  image: string | null;
  labels: Label[];
  onLabelsChange: (labels: Label[]) => void;
}

export default function ImageViewer({ image, labels, onLabelsChange }: ImageViewerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<OLMap | null>(null);
  const [viewMode, setViewMode] = useState<'canvas' | 'map'>('canvas');
  const [drawMode, setDrawMode] = useState<'bbox' | 'polygon' | null>(null);
  const [currentImageExtent, setCurrentImageExtent] = useState<number[]>([0, 0, 1000, 1000]);

  // Canvas mode refs (legacy)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingBox, setDrawingBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const labelColors = {
    Building: '#3B82F6',
    Vehicle: '#10B981',
    Tree: '#F59E0B',
    default: '#6B7280'
  };

  const handleImageLoad = useCallback(() => {
    if (imageRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = imageRef.current;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // Center the image
      setPosition({
        x: (canvas.width - img.naturalWidth) / 2,
        y: (canvas.height - img.naturalHeight) / 2
      });
      
      drawImage();
    }
  }, []);

  const drawImage = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const img = imageRef.current;
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    ctx.restore();

    // Draw labels
    labels.forEach((label) => {
      if (label.visible !== false) {
        drawLabel(ctx, label);
      }
    });

    // Draw current drawing box
    if (drawingBox) {
      const { startX, startY, endX, endY } = drawingBox;
      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);

      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);
    }
  }, [position, scale, labels, drawingBox]);

  const drawLabel = (ctx: CanvasRenderingContext2D, label: Label) => {
    const color = labelColors[label.label as keyof typeof labelColors] || labelColors.default;

    if (label.type === 'bbox' && Array.isArray(label.coordinates)) {
      const coords = label.coordinates as number[][];
      if (coords.length >= 2) {
        const x1 = coords[0][0], y1 = coords[0][1];
        const x2 = coords[1][0], y2 = coords[1][1];
        const x = Math.min(x1, x2);
        const y = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Draw label text background
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 20, Math.max(width, 60), 20);

      // Draw label text
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText(label.label, x + 4, y - 6);
    } else if (label.type === 'polygon' && Array.isArray(label.coordinates) && Array.isArray(label.coordinates[0])) {
      // Draw polygon
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const coords = label.coordinates[0] as number[][];
      if (coords.length > 0) {
        ctx.moveTo(coords[0][0], coords[0][1]);
        for (let i = 1; i < coords.length; i++) {
          ctx.lineTo(coords[i][0], coords[i][1]);
        }
        ctx.closePath();
        ctx.stroke();

        // Label text at centroid
        const centroid = coords.reduce((acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]], [0, 0]);
        centroid[0] /= coords.length;
        centroid[1] /= coords.length;

        ctx.fillStyle = color;
        ctx.fillRect(centroid[0] - 30, centroid[1] - 10, 60, 20);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(label.label, centroid[0] - 26, centroid[1] + 4);
      }
    }
  };

  const drawDrawingBox = (ctx: CanvasRenderingContext2D) => {
    if (!drawingBox) return;
    
    const { startX, startY, endX, endY } = drawingBox;
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);
  };

  useEffect(() => {
    drawImage();
  }, [drawImage]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on existing label
    const clickedLabel = labels.find(label => {
      if (label.type === 'bbox' && Array.isArray(label.coordinates)) {
        const coords = label.coordinates as number[][];
        if (coords.length >= 2) {
          const x1 = coords[0][0], y1 = coords[0][1];
          const x2 = coords[1][0], y2 = coords[1][1];
          const lx = Math.min(x1, x2), ly = Math.min(y1, y2);
          const lwidth = Math.abs(x2 - x1), lheight = Math.abs(y2 - y1);
          return x >= lx && x <= lx + lwidth && y >= ly && y <= ly + lheight;
        }
      } else if (label.type === 'polygon' && Array.isArray(label.coordinates) && Array.isArray(label.coordinates[0])) {
        // Simple point-in-polygon check (can be improved)
        const coords = label.coordinates[0] as number[][];
        let inside = false;
        for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
          if (((coords[i][1] > y) !== (coords[j][1] > y)) &&
              (x < (coords[j][0] - coords[i][0]) * (y - coords[i][1]) / (coords[j][1] - coords[i][1]) + coords[i][0])) {
            inside = !inside;
          }
        }
        return inside;
      }
      return false;
    });

    if (clickedLabel) {
      setSelectedLabel(clickedLabel.id);
      return;
    }

    // Start drawing new box
    setIsDrawing(true);
    setDrawingBox({ startX: x, startY: y, endX: x, endY: y });
    setSelectedLabel(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDrawing && drawingBox) {
      setDrawingBox(prev => prev ? { ...prev, endX: x, endY: y } : null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing && drawingBox) {
      const { startX, startY, endX, endY } = drawingBox;
      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);

      if (width > 10 && height > 10) {
        const newLabel: Label = {
          id: Date.now().toString(),
          type: 'bbox',
          label: 'Building', // Default label
          coordinates: [[x, y], [x + width, y + height]],
          confidence: 1.0,
          visible: true
        };

        onLabelsChange([...labels, newLabel]);
      }

      setIsDrawing(false);
      setDrawingBox(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
  };

  const zoomIn = () => setScale(prev => Math.min(5, prev * 1.2));
  const zoomOut = () => setScale(prev => Math.max(0.1, prev * 0.8));
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (imageRef.current && event.target?.result) {
          imageRef.current.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Update image when prop changes
  useEffect(() => {
    if (image && imageRef.current) {
      imageRef.current.src = image;
    }
  }, [image]);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={zoomOut}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-300">{Math.round(scale * 100)}%</span>
            <button
              onClick={zoomIn}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={resetView}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Upload Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-hidden bg-gray-900 flex items-center justify-center">
        {image ? (
          <div className="relative">
            <img
              ref={imageRef}
              src={image}
              alt="Geospatial Image"
              className="hidden"
              onLoad={handleImageLoad}
            />
            <canvas
              ref={canvasRef}
              className="border border-gray-700 cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
            />
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <Upload className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold mb-2">No Image Loaded</h3>
            <p className="mb-4">Upload a geospatial image to start labeling</p>
            <label className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer">
              <Upload className="w-5 h-5" />
              <span>Choose Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
