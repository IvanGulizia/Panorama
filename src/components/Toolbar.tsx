import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Pencil, Eraser, PaintBucket, Palette, Sliders, ToggleLeft, ToggleRight, Check } from 'lucide-react';

const PRESET_COLORS = [
  '#1C1C1C', '#A38771', '#839788', '#7A8B99', 
  '#E8D8CE', '#F4E8C1', '#D4E4BC', '#C6D8D3', 
  '#D8CDE0', '#FAF9F6'
];
const PRESET_SIZES = [2, 5, 10, 20, 40];

export const Toolbar: React.FC = () => {
  const { 
    mode, 
    tool, 
    color, 
    brushSize, 
    eraserMode,
    strokeSmoothing,
    fillStrokeThickness,
    setTool, 
    setColor, 
    setBrushSize,
    setEraserMode,
    setStrokeSmoothing,
    setFillStrokeThickness
  } = useStore();

  const [colorOpen, setColorOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [eraserOpen, setEraserOpen] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);

  const colorRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<HTMLDivElement>(null);
  const eraserRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colorRef.current && !colorRef.current.contains(event.target as Node)) {
        setColorOpen(false);
      }
      if (sizeRef.current && !sizeRef.current.contains(event.target as Node)) {
        setSizeOpen(false);
      }
      if (eraserRef.current && !eraserRef.current.contains(event.target as Node)) {
        setEraserOpen(false);
      }
      if (fillRef.current && !fillRef.current.contains(event.target as Node)) {
        setFillOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (mode === 'play') return null;

  return (
    <aside id="toolbar-container" className="w-16 h-full border-r border-[#ececec] flex flex-col items-center py-6 gap-6 bg-white z-20 shrink-0">
      <div className="flex flex-col gap-4">
        {/* Brush Tool */}
        <button
          id="tool-brush-btn"
          onClick={() => {
            setTool('brush');
            setSizeOpen(false);
            setColorOpen(false);
          }}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
            tool === 'brush' 
              ? 'bg-black text-white shadow-sm' 
              : 'text-[#a1a1a1] hover:bg-[#f5f5f5] hover:text-black'
          }`}
          title="Pinceau (Dessiner)"
        >
          <Pencil size={18} />
        </button>

        {/* Lasso Fill Tool */}
        <div className="relative" ref={fillRef}>
          <button
            id="tool-fill-btn"
            onClick={() => {
              if (tool !== 'fill') {
                setTool('fill');
              } else {
                setFillOpen(!fillOpen);
              }
              setSizeOpen(false);
              setColorOpen(false);
              setEraserOpen(false);
            }}
            className={`w-10 h-10 flex flex-col items-center justify-center rounded-xl transition-all relative ${
              tool === 'fill' 
                ? 'bg-black text-white shadow-sm' 
                : 'text-[#a1a1a1] hover:bg-[#f5f5f5] hover:text-black'
            }`}
            title="Remplissage Lasso (Cliquez à nouveau pour les options)"
          >
            <PaintBucket size={18} />
            {tool === 'fill' && (
              <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
            )}
          </button>
          {fillOpen && tool === 'fill' && (
            <div className="absolute left-14 top-0 w-64 bg-white border border-[#ececec] rounded-xl shadow-lg p-4 z-30 flex flex-col gap-3 animate-in fade-in slide-in-from-left-2 duration-150">
              <span className="text-xs font-semibold text-gray-500">Contour de remplissage</span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-700">Épaisseur</span>
                <span className="font-mono text-xs font-bold">{fillStrokeThickness > 0 ? `${fillStrokeThickness}px` : 'Désactivé'}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="40" 
                value={fillStrokeThickness} 
                onChange={(e) => setFillStrokeThickness(Number(e.target.value))}
                className="w-full accent-black cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
              />
            </div>
          )}
        </div>

        {/* Eraser Tool with Popover for Eraser Mode */}
        <div className="relative" ref={eraserRef}>
          <button
            id="tool-eraser-btn"
            onClick={() => {
              if (tool !== 'eraser') {
                setTool('eraser');
              } else {
                setEraserOpen(!eraserOpen);
              }
              setColorOpen(false);
              setSizeOpen(false);
            }}
            className={`w-10 h-10 flex flex-col items-center justify-center rounded-xl transition-all relative ${
              tool === 'eraser' 
                ? 'bg-black text-white shadow-sm' 
                : 'text-[#a1a1a1] hover:bg-[#f5f5f5] hover:text-black'
            }`}
            title="Gomme (Cliquez à nouveau pour les options)"
          >
            <Eraser size={18} />
            {tool === 'eraser' && (
              <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
          </button>

          {eraserOpen && tool === 'eraser' && (
            <div className="absolute left-14 top-0 w-52 bg-white border border-[#ececec] rounded-xl shadow-lg p-3 z-30 flex flex-col gap-2 animate-in fade-in slide-in-from-left-2 duration-150">
              <span className="text-xs font-semibold text-gray-500 px-1">Mode de la Gomme</span>
              <div className="h-px bg-[#ececec] my-1" />
              
              <button
                onClick={() => {
                  setEraserMode('stroke');
                  setEraserOpen(false);
                }}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${
                  eraserMode === 'stroke' 
                    ? 'bg-gray-100 text-black font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Effacer le tracé entier</span>
                {eraserMode === 'stroke' && <Check size={14} />}
              </button>
              
              <button
                onClick={() => {
                  setEraserMode('classic');
                  setEraserOpen(false);
                }}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${
                  eraserMode === 'classic' 
                    ? 'bg-gray-100 text-black font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Gomme classique (Pixel)</span>
                {eraserMode === 'classic' && <Check size={14} />}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="w-8 h-px bg-[#ececec] shrink-0" />

      {/* Brush Settings: Size & Color Popovers */}
      <div className="flex flex-col gap-4 mt-1">
        {/* Brush Size Popover */}
        <div className="relative" ref={sizeRef}>
          <button
            id="brush-size-btn"
            onClick={() => {
              setSizeOpen(!sizeOpen);
              setColorOpen(false);
              setEraserOpen(false);
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
              sizeOpen 
                ? 'bg-[#f5f5f5] text-black border border-gray-200' 
                : 'text-[#a1a1a1] hover:bg-[#f5f5f5] hover:text-black'
            }`}
            title="Taille du pinceau"
          >
            <Sliders size={18} />
          </button>

          {sizeOpen && (
            <div className="absolute left-14 top-0 w-64 bg-white border border-[#ececec] rounded-xl shadow-lg p-4 z-30 flex flex-col gap-3 animate-in fade-in slide-in-from-left-2 duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Taille: {brushSize}px</span>
                <div 
                  className="rounded-full bg-black" 
                  style={{ 
                    width: Math.min(24, Math.max(2, brushSize)), 
                    height: Math.min(24, Math.max(2, brushSize)) 
                  }} 
                />
              </div>

              {/* Slider */}
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={brushSize} 
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-full accent-black cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
              />

              {/* Presets */}
              <div className="flex items-center justify-between mt-1 mb-2">
                {PRESET_SIZES.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setBrushSize(sz)}
                    className={`px-2 py-1 text-xs border rounded-md transition-colors ${
                      brushSize === sz 
                        ? 'bg-black text-white border-black font-semibold' 
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {sz}px
                  </button>
                ))}
              </div>

              <div className="h-px bg-gray-200/60" />

              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-semibold text-gray-500">Lissage (Stabilisation)</span>
                <span className="font-mono text-xs font-bold">{strokeSmoothing}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="20" 
                value={strokeSmoothing} 
                onChange={(e) => setStrokeSmoothing(Number(e.target.value))}
                className="w-full accent-black cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
              />
            </div>
          )}
        </div>

        {/* Brush Color Popover */}
        <div className="relative" ref={colorRef}>
          <button
            id="brush-color-btn"
            onClick={() => {
              setColorOpen(!colorOpen);
              setSizeOpen(false);
              setEraserOpen(false);
            }}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-[#f5f5f5]"
            title="Couleur du pinceau"
          >
            <div 
              className="w-5 h-5 rounded-full ring-2 ring-white shadow-sm border border-gray-100" 
              style={{ backgroundColor: color }}
            />
          </button>

          {colorOpen && (
            <div className="absolute left-14 top-0 w-52 bg-white border border-[#ececec] rounded-xl shadow-lg p-3.5 z-30 flex flex-col gap-3 animate-in fade-in slide-in-from-left-2 duration-150">
              <span className="text-xs font-semibold text-gray-500">Palette de couleurs</span>
              
              {/* Presets Grid */}
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110 active:scale-95 ${
                      color === c 
                        ? 'ring-2 ring-black ring-offset-1 border border-white' 
                        : 'border border-gray-200'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>

              <div className="h-px bg-[#ececec]" />

              {/* Custom Color Selector */}
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden bg-transparent shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Custom Color</span>
                  <input
                    type="text"
                    value={color.toUpperCase()}
                    onChange={(e) => {
                      if (e.target.value.startsWith('#') && e.target.value.length <= 7) {
                        setColor(e.target.value);
                      }
                    }}
                    className="text-xs font-mono font-semibold text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 uppercase max-w-[80px]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
