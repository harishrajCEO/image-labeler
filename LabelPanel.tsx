'use client';

import { useState } from 'react';
import { 
  Download, 
  Eye, 
  EyeOff, 
  Trash2, 
  Edit3, 
  Check,
  X,
  Plus
} from 'lucide-react';

interface Label {
  id: string;
  type: 'bbox' | 'polygon';
  label: string;
  coordinates: number[][][] | number[][]; // [x,y] for bbox, [[[x,y]]] for polygon
  confidence?: number;
  visible?: boolean;
}

interface LabelPanelProps {
  labels: Label[];
  onLabelsChange: (labels: Label[]) => void;
  onExport: () => void;
}

const labelTypes = ['Building', 'Vehicle', 'Tree', 'Road', 'Water', 'Field'];

export default function LabelPanel({ labels, onLabelsChange, onExport }: LabelPanelProps) {
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [newLabelType, setNewLabelType] = useState('Building');

  const toggleLabelVisibility = (labelId: string) => {
    onLabelsChange(
      labels.map(label =>
        label.id === labelId ? { ...label, visible: !label.visible } : label
      )
    );
  };

  const deleteLabel = (labelId: string) => {
    onLabelsChange(labels.filter(label => label.id !== labelId));
  };

  const updateLabelType = (labelId: string, newType: string) => {
    onLabelsChange(
      labels.map(label =>
        label.id === labelId ? { ...label, label: newType } : label
      )
    );
    setEditingLabel(null);
  };

  const addNewLabel = () => {
    const newLabel: Label = {
      id: Date.now().toString(),
      type: 'bbox',
      label: newLabelType,
      coordinates: [
        [Math.random() * 200 + 50, Math.random() * 200 + 50],
        [Math.random() * 200 + 150, Math.random() * 200 + 120]
      ],
      confidence: 1.0,
      visible: true
    };
    onLabelsChange([...labels, newLabel]);
  };

  const getLabelColor = (labelType: string) => {
    const colors = {
      Building: '#3B82F6',
      Vehicle: '#10B981',
      Tree: '#F59E0B',
      Road: '#8B5CF6',
      Water: '#06B6D4',
      Field: '#84CC16',
      default: '#6B7280'
    };
    return colors[labelType as keyof typeof colors] || colors.default;
  };

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Labels</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={addNewLabel}
              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              title="Add Random Label"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={onExport}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              title="Export Labels"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          {labels.length} label{labels.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Label List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {labels.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <Eye className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p>No labels yet</p>
            <p className="text-sm">Draw boxes on the image or use AI Label</p>
          </div>
        ) : (
          labels.map((label) => (
            <div
              key={label.id}
              className="bg-gray-700 rounded-lg p-3 border border-gray-600"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getLabelColor(label.label) }}
                  />
                  {editingLabel === label.id ? (
                    <select
                      value={label.label}
                      onChange={(e) => updateLabelType(label.id, e.target.value)}
                      className="bg-gray-600 text-white text-sm rounded px-2 py-1"
                      autoFocus
                    >
                      {labelTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-white font-medium">{label.label}</span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => toggleLabelVisibility(label.id)}
                    className={`p-1 rounded ${
                      label.visible !== false
                        ? 'text-green-400 hover:text-green-300'
                        : 'text-gray-500 hover:text-gray-400'
                    }`}
                    title={label.visible !== false ? 'Hide' : 'Show'}
                  >
                    {label.visible !== false ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditingLabel(label.id)}
                    className="p-1 text-gray-400 hover:text-white rounded"
                    title="Edit Label"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteLabel(label.id)}
                    className="p-1 text-red-400 hover:text-red-300 rounded"
                    title="Delete Label"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="capitalize">{label.type}</span>
                </div>
                {label.type === 'bbox' && Array.isArray(label.coordinates) && label.coordinates.length >= 2 && (
                  <>
                    <div className="flex justify-between">
                      <span>Position:</span>
                      <span>({Math.round((label.coordinates[0] as number[])[0])}, {Math.round((label.coordinates[0] as number[])[1])})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span>{Math.round(Math.abs((label.coordinates[1] as number[])[0] - (label.coordinates[0] as number[])[0]))} × {Math.round(Math.abs((label.coordinates[1] as number[])[1] - (label.coordinates[0] as number[])[1]))}</span>
                    </div>
                  </>
                )}
                {label.type === 'polygon' && Array.isArray(label.coordinates) && Array.isArray(label.coordinates[0]) && (
                  <div className="flex justify-between">
                    <span>Vertices:</span>
                    <span>{label.coordinates[0].length}</span>
                  </div>
                )}
                {label.confidence && (
                  <div className="flex justify-between">
                    <span>Confidence:</span>
                    <span>{Math.round(label.confidence * 100)}%</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>Total Labels:</span>
            <span>{labels.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Visible:</span>
            <span>{labels.filter(l => l.visible !== false).length}</span>
          </div>
          <div className="flex justify-between">
            <span>Hidden:</span>
            <span>{labels.filter(l => l.visible === false).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
