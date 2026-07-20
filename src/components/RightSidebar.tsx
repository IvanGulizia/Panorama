import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import { 
  Eye, EyeOff, Plus, Trash2, Layers, Settings as SettingsIcon, 
  GripVertical, Folder, FolderPlus, ZoomIn, Grid3X3, Download, Upload,
  Check, ChevronDown, ChevronRight, Edit3
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export const RightSidebar: React.FC = () => {
  const { mode } = useStore();
  const [activeTab, setActiveTab] = useState<'layers' | 'settings'>('layers');

  if (mode === 'play') return null;

  return (
    <aside id="right-sidebar" className="w-80 h-full border-l border-[#ececec] bg-white flex flex-col z-20 shrink-0">
      <div className="flex border-b border-[#ececec] shrink-0">
        <button
          id="tab-layers"
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'layers' 
              ? 'text-black border-b-2 border-black font-extrabold bg-[#fafafa]' 
              : 'text-[#a1a1a1] hover:text-black hover:bg-[#fafafa]'
          }`}
        >
          <Layers size={13} />
          Calques
        </button>
        <button
          id="tab-settings"
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'settings' 
              ? 'text-black border-b-2 border-black font-extrabold bg-[#fafafa]' 
              : 'text-[#a1a1a1] hover:text-black hover:bg-[#fafafa]'
          }`}
        >
          <SettingsIcon size={13} />
          Réglages
        </button>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'layers' ? <LayersPanel /> : <SettingsPanel />}
      </div>
    </aside>
  );
};

const LayersPanel: React.FC = () => {
  const { 
    project, 
    selectedPlaneId, 
    addPlane, 
    deletePlane, 
    updatePlane, 
    selectPlane, 
    reorderPlanes,
    createStrokeGroup,
    renameStrokeGroup,
    toggleStrokeGroupVisibility,
    deleteStrokeGroup,
    renameStroke,
    toggleStrokeVisibility,
    deleteStroke,
    addStrokeToGroup
  } = useStore();

  const [editingPlaneId, setEditingPlaneId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [showIndependentStrokes, setShowIndependentStrokes] = useState<boolean>(false);
  const [isStrokesCollapsed, setIsStrokesCollapsed] = useState<boolean>(false);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderPlanes(result.source.index, result.destination.index);
  };

  const handleCreateGroup = () => {
    if (!selectedPlaneId) return;
    const groupName = prompt("Nom du nouveau groupe :", "Groupe " + ((project.planes.find(p => p.id === selectedPlaneId)?.groups?.length || 0) + 1));
    if (groupName) {
      createStrokeGroup(selectedPlaneId, groupName);
    }
  };

  const activePlane = project.planes.find(p => p.id === selectedPlaneId);
  const groups = activePlane?.groups || [];
  const strokes = activePlane?.strokes || [];

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const startEditingItem = (id: string, currentName: string) => {
    setEditingItemId(id);
    setEditingItemText(currentName);
  };

  const saveItemRename = (id: string, isGroup: boolean) => {
    if (!selectedPlaneId || !editingItemText.trim()) {
      setEditingItemId(null);
      return;
    }
    if (isGroup) {
      renameStrokeGroup(selectedPlaneId, id, editingItemText);
    } else {
      renameStroke(selectedPlaneId, id, editingItemText);
    }
    setEditingItemId(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Layers Section */}
      <div className={`${isStrokesCollapsed ? 'flex-1' : 'flex-[1.4]'} flex flex-col border-b border-[#ececec] overflow-hidden ${isStrokesCollapsed ? '' : 'min-h-[45%]'}`}>
        <div className="px-4 py-3 border-b border-[#ececec] flex items-center justify-between bg-gray-50 shrink-0">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#707070] flex items-center gap-1.5">
            <Layers size={13} />
            Pile des Calques
          </h2>
          <button
            onClick={addPlane}
            className="p-1 hover:bg-gray-200 rounded text-black transition-colors"
            title="Ajouter un calque"
          >
            <Plus size={15} />
          </button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="planes-list">
            {(provided) => (
              <div 
                className="overflow-y-auto p-3 flex flex-col gap-1.5 flex-1"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {project.planes.map((plane, index) => (
                  // @ts-expect-error - key is a valid React prop but types may be slightly off
                  <Draggable key={plane.id} draggableId={plane.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer bg-white ${
                          selectedPlaneId === plane.id
                            ? 'border-black shadow-sm ring-1 ring-black/10'
                            : 'border-[#ececec] hover:border-gray-400'
                        }`}
                        onClick={() => selectPlane(plane.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div {...provided.dragHandleProps} className="text-[#a1a1a1] hover:text-black p-1 cursor-grab active:cursor-grabbing">
                              <GripVertical size={13} />
                            </div>
                            {editingPlaneId === plane.id ? (
                              <input
                                type="text"
                                value={plane.name}
                                autoFocus
                                onBlur={() => setEditingPlaneId(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') setEditingPlaneId(null);
                                }}
                                onChange={(e) => updatePlane(plane.id, { name: e.target.value })}
                                className="font-semibold text-xs bg-white border border-[#d1d1d1] rounded px-1.5 py-0.5 w-32 focus:outline-none focus:border-black"
                              />
                            ) : (
                              <span
                                className="font-semibold text-xs truncate max-w-[120px] select-none"
                                onDoubleClick={() => setEditingPlaneId(plane.id)}
                                title="Double-cliquez pour renommer"
                              >
                                {plane.name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePlane(plane.id, { visible: !plane.visible });
                              }}
                              className="p-1 text-[#a1a1a1] hover:text-black hover:bg-gray-100 rounded transition-colors"
                              title="Afficher/Masquer le calque"
                            >
                              {plane.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Supprimer le calque "${plane.name}" ?`)) {
                                  deletePlane(plane.id);
                                }
                              }}
                              className="p-1 text-[#a1a1a1] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Supprimer le calque"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 mt-2 px-1">
                          {/* Parallax Factor */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#808080] font-medium uppercase">Parallaxe:</span>
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.1"
                              value={plane.parallaxX}
                              onChange={(e) => updatePlane(plane.id, { parallaxX: parseFloat(e.target.value) || 0 })}
                              className="w-14 accent-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                            />
                            <div className="relative flex items-center shrink-0">
                              <input
                                type="number"
                                step="0.01"
                                value={plane.parallaxX}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  updatePlane(plane.id, { parallaxX: isNaN(val) ? 0 : val });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="w-12 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 focus:bg-white focus:border-black rounded px-1 py-0.5 text-[10px] font-mono font-bold text-black text-center focus:outline-none"
                              />
                              <span className="text-[9px] font-semibold text-gray-400 absolute right-1 pointer-events-none">x</span>
                            </div>
                          </div>

                          {/* Blur setting */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#808080] font-medium uppercase">Flou:</span>
                            <input
                              type="range"
                              min="0"
                              max="50"
                              step="1"
                              value={plane.blur ?? 0}
                              onChange={(e) => updatePlane(plane.id, { blur: parseInt(e.target.value) || 0 })}
                              className="w-14 accent-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                            />
                            <span className="text-[10px] font-mono font-bold text-black">{plane.blur ?? 0}px</span>
                          </div>

                          {/* Blend mode selector */}
                          <div className="flex items-center gap-1 ml-auto">
                            <select
                              value={plane.blendMode || 'normal'}
                              onChange={(e) => updatePlane(plane.id, { blendMode: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="bg-transparent text-[10px] border border-gray-200 rounded p-0.5 font-medium text-gray-700 outline-none focus:border-black"
                            >
                              <option value="normal">Normal</option>
                              <option value="multiply">Produit</option>
                              <option value="screen">Superposition</option>
                              <option value="difference">Différence</option>
                              <option value="exclusion">Exclusion</option>
                              <option value="add">Ajout</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Strokes Outliner Section */}
      <div className={`${isStrokesCollapsed ? 'shrink-0 border-t border-[#ececec]' : 'flex-[0.6]'} flex flex-col overflow-hidden ${isStrokesCollapsed ? 'h-auto min-h-0' : 'min-h-[25%]'}`}>
        <div 
          onClick={() => setIsStrokesCollapsed(!isStrokesCollapsed)}
          className="px-4 py-2 border-b border-[#ececec] flex items-center justify-between bg-gray-50 shrink-0 cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-1.5 select-none">
            {isStrokesCollapsed ? <ChevronRight size={13} className="text-[#707070]" /> : <ChevronDown size={13} className="text-[#707070]" />}
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#707070] flex items-center gap-1.5">
              <Folder size={13} />
              Tracés & Groupes
            </h2>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {selectedPlaneId && !isStrokesCollapsed && (
              <button
                onClick={handleCreateGroup}
                className="p-1 hover:bg-gray-200 rounded text-black transition-colors flex items-center gap-1"
                title="Créer un groupe"
              >
                <FolderPlus size={15} />
              </button>
            )}
          </div>
        </div>

        {!isStrokesCollapsed && (
          selectedPlaneId ? (
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {groups.length === 0 && strokes.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#a1a1a1]">
                Aucun tracé sur ce calque.<br />Dessinez pour commencer.
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* 1. Groups Tree */}
                {groups.map((group) => {
                  const isCollapsed = !!collapsedGroups[group.id];
                  const groupStrokes = strokes.filter(s => s.groupId === group.id);

                  return (
                    <div key={group.id} className="border border-gray-100 rounded-lg overflow-hidden bg-[#fafafa]/50">
                      <div className="flex items-center justify-between p-1.5 bg-gray-50 border-b border-gray-100 hover:bg-gray-100/70 transition-colors">
                        <div className="flex items-center gap-1 min-w-0">
                          <button 
                            onClick={() => toggleGroupCollapse(group.id)}
                            className="text-[#707070] hover:text-black p-0.5"
                          >
                            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                          </button>
                          <Folder size={12} className="text-yellow-600 shrink-0" />
                          
                          {editingItemId === group.id ? (
                            <input
                              type="text"
                              value={editingItemText}
                              autoFocus
                              onChange={(e) => setEditingItemText(e.target.value)}
                              onBlur={() => saveItemRename(group.id, true)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveItemRename(group.id, true);
                                if (e.key === 'Escape') setEditingItemId(null);
                              }}
                              className="text-xs font-semibold bg-white border border-[#d1d1d1] rounded px-1 py-0.2 focus:outline-none focus:border-black max-w-[100px]"
                            />
                          ) : (
                            <span 
                              className="text-xs font-semibold text-gray-700 truncate max-w-[100px] cursor-pointer"
                              onDoubleClick={() => startEditingItem(group.id, group.name)}
                              title="Double-cliquez pour renommer"
                            >
                              {group.name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => toggleStrokeGroupVisibility(selectedPlaneId, group.id)}
                            className="p-1 text-[#a1a1a1] hover:text-black rounded"
                            title="Masquer/Afficher le groupe"
                          >
                            {group.visible !== false ? <Eye size={12} /> : <EyeOff size={12} />}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Dissoudre le groupe "${group.name}" ? (Les tracés seront conservés)`)) {
                                deleteStrokeGroup(selectedPlaneId, group.id);
                              }
                            }}
                            className="p-1 text-[#a1a1a1] hover:text-red-500 rounded"
                            title="Supprimer le groupe"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Group Contents */}
                      {!isCollapsed && (
                        <div className="pl-3.5 pr-1.5 py-0.5 space-y-1 bg-white border-t border-gray-50">
                          {groupStrokes.length === 0 ? (
                            <div className="text-[10px] text-[#a1a1a1] italic py-1 pl-4">Groupe vide</div>
                          ) : (
                            groupStrokes.map((stroke) => (
                              <div key={stroke.id} className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-gray-50 text-xs">
                                <div className="flex items-center gap-1 min-w-0">
                                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: stroke.color }} />
                                  {editingItemId === stroke.id ? (
                                    <input
                                      type="text"
                                      value={editingItemText}
                                      autoFocus
                                      onChange={(e) => setEditingItemText(e.target.value)}
                                      onBlur={() => saveItemRename(stroke.id, false)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveItemRename(stroke.id, false);
                                        if (e.key === 'Escape') setEditingItemId(null);
                                      }}
                                      className="text-[11px] bg-white border border-[#d1d1d1] rounded px-1 focus:outline-none focus:border-black max-w-[80px]"
                                    />
                                  ) : (
                                    <span 
                                      className="text-gray-600 truncate max-w-[85px] cursor-pointer"
                                      onDoubleClick={() => startEditingItem(stroke.id, stroke.name || "Tracé")}
                                      title="Double-cliquez pour renommer"
                                    >
                                      {stroke.name || "Tracé"}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5">
                                  {/* Quick Move out of Group */}
                                  <select
                                    value={group.id}
                                    onChange={(e) => addStrokeToGroup(selectedPlaneId, stroke.id, e.target.value === 'none' ? null : e.target.value)}
                                    className="bg-transparent text-[9px] border-none text-[#a1a1a1] hover:text-black p-0 focus:ring-0 max-w-[45px] cursor-pointer"
                                    title="Déplacer vers un autre groupe"
                                  >
                                    <option value={group.id}>En groupe</option>
                                    <option value="none">Retirer</option>
                                  </select>
                                  
                                  <button
                                    onClick={() => toggleStrokeVisibility(selectedPlaneId, stroke.id)}
                                    className="p-0.5 text-[#a1a1a1] hover:text-black rounded"
                                  >
                                    {stroke.visible !== false ? <Eye size={11} /> : <EyeOff size={11} />}
                                  </button>
                                  <button
                                    onClick={() => deleteStroke(selectedPlaneId, stroke.id)}
                                    className="p-0.5 text-[#a1a1a1] hover:text-red-500 rounded"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 2. Ungrouped Strokes */}
                <div className="space-y-1">
                  <div 
                    className="flex items-center gap-1 cursor-pointer px-1 mt-0.5 hover:text-black group"
                    onClick={() => setShowIndependentStrokes(!showIndependentStrokes)}
                  >
                    <span className="text-gray-400 group-hover:text-black">
                      {showIndependentStrokes ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-black uppercase block">Tracés Indépendants</span>
                  </div>
                  {showIndependentStrokes && (
                    <div className="space-y-1">
                      {strokes.filter(s => !s.groupId).length === 0 ? (
                    <span className="text-[10px] text-gray-400 italic block px-1.5 py-1">Aucun tracé hors groupe</span>
                  ) : (
                    strokes.filter(s => !s.groupId).map((stroke) => (
                      <div key={stroke.id} className="flex items-center justify-between py-1 px-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 text-xs bg-white">
                        <div className="flex items-center gap-1 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: stroke.color }} />
                          {editingItemId === stroke.id ? (
                            <input
                              type="text"
                              value={editingItemText}
                              autoFocus
                              onChange={(e) => setEditingItemText(e.target.value)}
                              onBlur={() => saveItemRename(stroke.id, false)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveItemRename(stroke.id, false);
                                if (e.key === 'Escape') setEditingItemId(null);
                              }}
                              className="text-xs bg-white border border-[#d1d1d1] rounded px-1 focus:outline-none focus:border-black max-w-[100px]"
                            />
                          ) : (
                            <span 
                              className="text-gray-700 truncate font-medium max-w-[100px] cursor-pointer"
                              onDoubleClick={() => startEditingItem(stroke.id, stroke.name || "Tracé")}
                              title="Double-cliquez pour renommer"
                            >
                              {stroke.name || "Tracé"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Dropdown to instantly group */}
                          {groups.length > 0 && (
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  addStrokeToGroup(selectedPlaneId, stroke.id, e.target.value);
                                }
                              }}
                              className="bg-transparent text-[10px] text-[#808080] hover:text-black border border-gray-200 rounded px-1 py-0.5 outline-none max-w-[70px] cursor-pointer"
                            >
                              <option value="">Grouper...</option>
                              {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
                          )}
                          
                          <button
                            onClick={() => toggleStrokeVisibility(selectedPlaneId, stroke.id)}
                            className="p-1 text-[#a1a1a1] hover:text-black rounded"
                            title="Masquer/Afficher le tracé"
                          >
                            {stroke.visible !== false ? <Eye size={12} /> : <EyeOff size={12} />}
                          </button>
                          <button
                            onClick={() => deleteStroke(selectedPlaneId, stroke.id)}
                            className="p-1 text-[#a1a1a1] hover:text-red-500 rounded"
                            title="Supprimer le tracé"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-xs text-[#a1a1a1]">
            Sélectionnez un calque pour voir ses tracés.
          </div>
        ))}
      </div>
    </div>
  );
};

const SettingsPanel: React.FC = () => {
  const { 
    project, 
    setProjectWidth, 
    setProjectBackgroundColor, 
    autoPanEnabled, 
    setAutoPanEnabled,
    zoomEnabled,
    setZoomEnabled,
    zoom,
    setZoom,
    setProject,
    // Grid settings
    setGridEnabled,
    setGridSize,
    setGridRoundness,
    setGridColor,
    setGridOpacity,
    setGridSnapEnabled,
    setGridSnapMode,
    setGridSnapRoundness
  } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", project.name.replace(/\s+/g, '_') + "_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const loadedProject = JSON.parse(e.target?.result as string);
          if (loadedProject && Array.isArray(loadedProject.planes)) {
            setProject(loadedProject);
          } else {
            alert("Fichier projet Panoramix invalide.");
          }
        } catch (err) {
          alert("Erreur lors de la lecture du fichier.");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="p-5 flex flex-col gap-5 overflow-y-auto h-full">
      {/* Zoom Settings */}
      <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#707070] mb-3 flex items-center gap-1.5">
          <ZoomIn size={14} />
          Zoom & Caméra
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 font-medium">Niveau du Zoom</span>
            <span className="text-xs font-mono font-bold">{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="4"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full accent-black cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
          />
          
          <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={zoomEnabled}
              onChange={(e) => setZoomEnabled(e.target.checked)}
              className="rounded border-gray-300 text-black focus:ring-black h-3.5 w-3.5"
            />
            <span className="text-xs text-gray-700 font-medium">Zoomer à la molette</span>
          </label>
        </div>
      </div>

      {/* Grid Settings */}
      <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#707070] mb-3 flex items-center gap-1.5">
          <Grid3X3 size={14} />
          Grille Paramétrable
        </h3>
        
        <div className="space-y-3.5">
          {/* Grid Visibility & Grid Snap */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={project.gridEnabled}
                onChange={(e) => setGridEnabled(e.target.checked)}
                className="rounded border-gray-300 text-black focus:ring-black h-3.5 w-3.5"
              />
              <span className="text-xs text-gray-700 font-medium">Afficher la grille</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={project.gridSnapEnabled}
                disabled={!project.gridEnabled}
                onChange={(e) => setGridSnapEnabled(e.target.checked)}
                className="rounded border-gray-300 text-black focus:ring-black h-3.5 w-3.5 disabled:opacity-50"
              />
              <span className="text-xs text-gray-700 font-medium disabled:opacity-50">Snap / Magnétisme sur la grille</span>
            </label>

            {project.gridEnabled && project.gridSnapEnabled && (
              <div className="pl-6 pt-1 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-100">
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Mode de magnétisme</span>
                <div className="grid grid-cols-2 gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200/50">
                  <button
                    type="button"
                    onClick={() => setGridSnapMode('straight')}
                    className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all ${
                      (project.gridSnapMode || 'straight') === 'straight'
                        ? 'bg-white text-black shadow-xs'
                        : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    Ligne Droite
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridSnapMode('freehand')}
                    className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all ${
                      project.gridSnapMode === 'freehand'
                        ? 'bg-white text-black shadow-xs'
                        : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    Tracé Libre
                  </button>
                </div>
              </div>
            )}

            {project.gridEnabled && project.gridSnapEnabled && project.gridSnapMode === 'freehand' && (
              <div className="pl-6 pt-2 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-100">
                <div className="flex justify-between text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
                  <span>Courbure / Arrondi</span>
                  <span className="font-bold text-gray-700">
                    {project.gridSnapRoundness === 0 ? "Angulaire (0%)" : `${project.gridSnapRoundness}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={project.gridSnapRoundness ?? 100}
                  onChange={(e) => setGridSnapRoundness(parseInt(e.target.value))}
                  className="w-full accent-black cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
                />
                <span className="text-[10px] text-gray-400 leading-normal">
                  Module l'arrondi des angles en tracé libre pour former des arcs de cercle.
                </span>
              </div>
            )}
          </div>

          <div className="h-px bg-gray-200/60" />

          {/* Grid Size */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Taille des carreaux</span>
              <span className="font-mono font-bold">{project.gridSize}px</span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              step="5"
              value={project.gridSize}
              onChange={(e) => setGridSize(parseInt(e.target.value))}
              className="w-full accent-black cursor-pointer h-1 bg-gray-200 rounded-lg appearance-none"
            />
          </div>

          {/* Grid Roundness (0 = line, >0 = dot) */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Style de grille</span>
              <span className="font-bold text-gray-800">
                {project.gridRoundness === 0 ? "Lignes" : `Points (${project.gridRoundness})`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={project.gridRoundness}
              onChange={(e) => setGridRoundness(parseInt(e.target.value))}
              className="w-full accent-black cursor-pointer h-1 bg-gray-200 rounded-lg appearance-none"
            />
          </div>

          {/* Grid Opacity */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Opacité de la grille</span>
              <span className="font-mono font-bold">{Math.round(project.gridOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={project.gridOpacity * 100}
              onChange={(e) => setGridOpacity(parseInt(e.target.value) / 100)}
              className="w-full accent-black cursor-pointer h-1 bg-gray-200 rounded-lg appearance-none"
            />
          </div>

          {/* Grid Color */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Couleur de la grille</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={project.gridColor}
                onChange={(e) => setGridColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border border-gray-300 p-0"
              />
              <span className="text-[10px] font-mono text-gray-500 uppercase">{project.gridColor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Dimensions & Background */}
      <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#707070] flex items-center gap-1.5">
          <Layers size={14} />
          Toile & Arrière-plan
        </h3>
        
        <div>
          <label className="text-xs text-gray-600 font-medium block mb-1">Longueur de boucle (px)</label>
          <input
            type="number"
            value={project.width}
            onChange={(e) => setProjectWidth(parseInt(e.target.value) || 2048)}
            className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-black font-semibold"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 font-medium">Couleur de fond</span>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={project.backgroundColor || '#f7f7f7'}
              onChange={(e) => setProjectBackgroundColor(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border border-gray-300 p-0"
            />
            <span className="text-xs font-mono uppercase text-gray-500 font-bold">{project.backgroundColor || '#f7f7f7'}</span>
          </div>
        </div>
      </div>

      {/* Depth of Field Options */}
      <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100 space-y-4">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input 
            type="checkbox" 
            checked={project.dofEnabled}
            onChange={(e) => useStore.getState().setDofEnabled(e.target.checked)}
            className="rounded border-gray-300 text-black focus:ring-black h-3.5 w-3.5"
          />
          <span className="text-xs text-gray-700 font-semibold">Profondeur de champ</span>
        </label>
        
        {project.dofEnabled && (
          <div className="pl-6 space-y-3 animate-in fade-in slide-in-from-top-1 duration-100">
            <div className="space-y-1">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block">Calque focal</span>
              <select
                value={project.focalPlaneId || ''}
                onChange={(e) => useStore.getState().setFocalPlaneId(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-black"
              >
                <option value="" disabled>Sélectionner...</option>
                {project.planes.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Portée (Range)</span>
                <span className="font-mono font-bold">{project.focalRange?.toFixed(1) ?? '1.0'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={project.focalRange ?? 1.0}
                onChange={(e) => useStore.getState().setFocalRange(parseFloat(e.target.value))}
                className="w-full accent-black cursor-pointer h-1 bg-gray-200 rounded-lg appearance-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Play Mode autoPan options */}
      <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input 
            type="checkbox" 
            checked={autoPanEnabled}
            onChange={(e) => setAutoPanEnabled(e.target.checked)}
            className="rounded border-gray-300 text-black focus:ring-black h-3.5 w-3.5"
          />
          <span className="text-xs text-gray-700 font-semibold">Auto-défilement aux bords</span>
        </label>
        <p className="text-[10px] text-[#a1a1a1] mt-1.5 leading-relaxed">
          En mode Play, déplacer le pointeur près des bords de l'écran fait défiler la caméra automatiquement.
        </p>
      </div>

      {/* Export & Import Actions */}
      <div className="h-px bg-gray-200" />
      <div className="flex flex-col gap-2 mt-1">
        <button 
          onClick={handleExport} 
          className="w-full px-4 py-2 border border-gray-200 hover:border-black rounded-lg text-xs font-semibold text-gray-700 hover:text-black hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-xs"
        >
          <Download size={13} />
          Exporter le Projet JSON
        </button>
        
        <button 
          onClick={handleImportClick} 
          className="w-full px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-xs"
        >
          <Upload size={13} />
          Importer un Projet JSON
        </button>
        <input 
          type="file" 
          ref={fileInputRef}
          accept=".json" 
          className="hidden" 
          onChange={handleImport} 
        />
      </div>
    </div>
  );
};
