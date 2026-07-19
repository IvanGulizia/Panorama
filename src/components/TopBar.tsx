import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Download, Upload, Play, PenTool, Undo2, Redo2, Trash2 } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { mode, setMode, project, setProject, past, future, undo, redo, clearAllStrokes } = useStore();
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    };
  }, []);

  const handleClearClick = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = setTimeout(() => {
        setConfirmClear(false);
      }, 3000);
    } else {
      clearAllStrokes();
      setConfirmClear(false);
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", project.name + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const loadedProject = JSON.parse(e.target?.result as string);
          setProject(loadedProject);
        } catch (err) {
          alert("Invalid project file.");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[#ececec] bg-white z-10">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">P</div>
        <h1 className="text-lg font-medium tracking-tight">Panoramix Studio <span className="text-[#a1a1a1] font-normal">/ {project.name}</span></h1>
      </div>

      <div className="flex bg-[#f3f3f3] p-1 rounded-full items-center">
        <button
          onClick={undo}
          disabled={past.length === 0}
          className="p-2 text-[#707070] hover:text-black disabled:opacity-30 disabled:hover:text-[#707070] transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          disabled={future.length === 0}
          className="p-2 text-[#707070] hover:text-black disabled:opacity-30 disabled:hover:text-[#707070] transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>
        <div className="w-px h-4 bg-[#d1d1d1] mx-2" />
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('panoramix:reset-view'))}
          className="p-2 text-[#707070] hover:text-black transition-colors"
          title="Reset Camera View"
        >
          <span className="text-xs font-bold px-1 uppercase">Reset View</span>
        </button>
        <div className="w-px h-4 bg-[#d1d1d1] mx-2" />
        <button
          onClick={handleClearClick}
          className={`p-2 transition-all flex items-center gap-1.5 rounded-lg px-3 py-1 ${
            confirmClear 
              ? 'bg-red-50 text-red-600 ring-1 ring-red-200 animate-pulse' 
              : 'text-[#707070] hover:text-red-500 hover:bg-red-50/50'
          }`}
          title={confirmClear ? "Cliquez à nouveau pour confirmer" : "Effacer tous les tracés"}
        >
          <Trash2 size={14} className="shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {confirmClear ? "Confirmer ?" : "Effacer Tout"}
          </span>
        </button>
        <div className="w-px h-4 bg-[#d1d1d1] mx-2" />
        <button
          onClick={() => setMode('draw')}
          className={`px-6 py-1.5 rounded-full text-sm font-semibold transition-all ${
            mode === 'draw' ? 'bg-white shadow-sm text-black' : 'text-[#707070] hover:text-black font-medium'
          }`}
        >
          Edit Mode
        </button>
        <button
          onClick={() => setMode('play')}
          className={`px-6 py-1.5 rounded-full text-sm font-semibold transition-all ${
            mode === 'play' ? 'bg-white shadow-sm text-black' : 'text-[#707070] hover:text-black font-medium'
          }`}
        >
          Play Mode
        </button>
      </div>

      <div className="flex items-center gap-3">
        {/* Export and Import are now placed inside the Settings Panel in the Right Sidebar */}
      </div>
    </header>
  );
};
