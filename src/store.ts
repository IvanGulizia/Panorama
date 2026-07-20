import { create } from 'zustand';
import { Project, Plane, Stroke, StrokeGroup } from './types';
import { v4 as uuidv4 } from 'uuid';

export type AppMode = 'draw' | 'play';
export type ToolType = 'brush' | 'eraser' | 'pan' | 'fill' | 'select';
export type EraserMode = 'stroke' | 'classic';

interface AppState {
  project: Project;
  past: Project[];
  future: Project[];
  mode: AppMode;
  selectedPlaneId: string | null;
  selectedStrokeId: string | null;
  tool: ToolType;
  color: string;
  fillColor: string;
  brushSize: number;
  eraserMode: EraserMode;
  autoPanEnabled: boolean;
  zoomEnabled: boolean;
  zoom: number; // Stored zoom level
  strokeSmoothing: number;
  fillStrokeThickness: number;

  setMode: (mode: AppMode) => void;
  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setEraserMode: (mode: EraserMode) => void;
  setAutoPanEnabled: (enabled: boolean) => void;
  setZoomEnabled: (enabled: boolean) => void;
  setZoom: (zoom: number) => void;
  setStrokeSmoothing: (smoothing: number) => void;
  setFillStrokeThickness: (thickness: number) => void;

  // Grid Actions
  setGridEnabled: (enabled: boolean) => void;
  setGridSize: (size: number) => void;
  setGridRoundness: (roundness: number) => void;
  setGridColor: (color: string) => void;
  setGridOpacity: (opacity: number) => void;
  setGridSnapEnabled: (enabled: boolean) => void;
  setGridSnapMode: (mode: 'straight' | 'freehand') => void;
  setGridSnapRoundness: (roundness: number) => void;

  setDofEnabled: (enabled: boolean) => void;
  setFocalPlaneId: (id: string | null) => void;
  setFocalRange: (range: number) => void;

  // Project Settings
  setProjectWidth: (width: number) => void;
  setProjectBackgroundColor: (color: string) => void;

  commit: () => void;
  undo: () => void;
  redo: () => void;

  // Planes Management
  addPlane: () => void;
  deletePlane: (id: string) => void;
  updatePlane: (id: string, updates: Partial<Plane>) => void;
  reorderPlanes: (startIndex: number, endIndex: number) => void;
  selectPlane: (id: string | null) => void;

  // Strokes Management (Outliner & Editing)
  setSelectedStrokeId: (id: string | null) => void;
  addStroke: (planeId: string, stroke: Stroke) => void;
  removeStrokes: (planeId: string, strokeIds: string[]) => void;
  deleteStroke: (planeId: string, strokeId: string) => void;
  renameStroke: (planeId: string, strokeId: string, name: string) => void;
  toggleStrokeVisibility: (planeId: string, strokeId: string) => void;
  updateStroke: (planeId: string, strokeId: string, updates: Partial<Stroke>) => void;
  duplicateStroke: (planeId: string, strokeId: string) => void;
  reorderStrokes: (planeId: string, startIndex: number, endIndex: number) => void;

  // Groups Management
  createStrokeGroup: (planeId: string, name: string) => void;
  renameStrokeGroup: (planeId: string, groupId: string, name: string) => void;
  toggleStrokeGroupVisibility: (planeId: string, groupId: string) => void;
  deleteStrokeGroup: (planeId: string, groupId: string) => void;
  addStrokeToGroup: (planeId: string, strokeId: string, groupId: string | null) => void;

  clearAllStrokes: () => void;
  setProject: (project: Project) => void;
}

const createDefaultPlane = (name: string, parallaxX: number): Plane => ({
  id: uuidv4(),
  name,
  visible: true,
  opacity: 1,
  parallaxX,
  parallaxY: 0,
  strokes: [],
  groups: [],
});

const initialProject: Project = {
  id: uuidv4(),
  name: 'Untitled Panorama',
  width: 2500,
  height: 1000,
  backgroundColor: '#ffffff',
  gridSize: 20,
  gridEnabled: false,
  gridRoundness: 80,
  gridColor: '#cccccc',
  gridOpacity: 0.5,
  gridSnapEnabled: false,
  gridSnapMode: 'straight',
  gridSnapRoundness: 100,
  dofEnabled: false,
  focalPlaneId: null,
  focalRange: 1.0,
  planes: [
    createDefaultPlane('Foreground', 1.2),
    createDefaultPlane('Midground 1', 1.0),
    createDefaultPlane('Midground 2', 0.8),
    createDefaultPlane('Background 1', 0.6),
    createDefaultPlane('Background 2', 0.4),
  ],
};

export const useStore = create<AppState>((set) => ({
  project: initialProject,
  past: [],
  future: [],
  mode: 'draw',
  selectedPlaneId: initialProject.planes[1].id,
  selectedStrokeId: null,
  tool: 'brush',
  color: '#1C1C1C',
  fillColor: '#FAF9F6',
  brushSize: 10,
  eraserMode: 'stroke',
  autoPanEnabled: false,
  zoomEnabled: false,
  zoom: 1.0,
  strokeSmoothing: 5,
  fillStrokeThickness: 2,

  setMode: (mode) => set({ mode }),
  setTool: (tool) => set({ tool }),
  setSelectedStrokeId: (selectedStrokeId) => set({ selectedStrokeId }),
  setColor: (color) => set({ color }),
  setFillColor: (fillColor) => set({ fillColor }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setEraserMode: (eraserMode) => set({ eraserMode }),
  setAutoPanEnabled: (autoPanEnabled) => set({ autoPanEnabled }),
  setZoomEnabled: (zoomEnabled) => set({ zoomEnabled }),
  setZoom: (zoom) => set({ zoom }),
  setStrokeSmoothing: (strokeSmoothing) => set({ strokeSmoothing }),
  setFillStrokeThickness: (fillStrokeThickness) => set({ fillStrokeThickness }),

  // Grid Actions
  setGridEnabled: (gridEnabled) => set((state) => ({
    past: [...state.past, state.project],
    future: [],
    project: { 
      ...state.project, 
      gridEnabled,
      gridSnapEnabled: gridEnabled ? true : state.project.gridSnapEnabled
    }
  })),
  setGridSize: (gridSize) => set((state) => ({
    past: [...state.past, state.project],
    future: [],
    project: { ...state.project, gridSize }
  })),
  setGridRoundness: (gridRoundness) => set((state) => ({
    past: [...state.past, state.project],
    future: [],
    project: { ...state.project, gridRoundness }
  })),
  setGridColor: (gridColor) => set((state) => ({
    project: { ...state.project, gridColor }
  })),
  setGridOpacity: (gridOpacity) => set((state) => ({
    project: { ...state.project, gridOpacity }
  })),
  setGridSnapEnabled: (gridSnapEnabled) => set((state) => ({
    project: { ...state.project, gridSnapEnabled }
  })),
  setGridSnapMode: (gridSnapMode) => set((state) => ({
    project: { ...state.project, gridSnapMode }
  })),
  setGridSnapRoundness: (gridSnapRoundness) => set((state) => ({
    project: { ...state.project, gridSnapRoundness }
  })),

  setDofEnabled: (dofEnabled) => set((state) => ({
    project: { ...state.project, dofEnabled }
  })),
  setFocalPlaneId: (focalPlaneId) => set((state) => ({
    project: { ...state.project, focalPlaneId }
  })),
  setFocalRange: (focalRange) => set((state) => ({
    project: { ...state.project, focalRange }
  })),

  // Project Settings
  setProjectWidth: (width) => set((state) => ({ 
    past: [...state.past, state.project],
    future: [],
    project: { ...state.project, width } 
  })),
  setProjectBackgroundColor: (backgroundColor) => set((state) => ({ 
    past: [...state.past, state.project],
    future: [],
    project: { ...state.project, backgroundColor } 
  })),

  commit: () => set((state) => ({
    past: [...state.past, state.project],
    future: []
  })),

  undo: () => set((state) => {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, -1);
    return {
      past: newPast,
      project: previous,
      future: [state.project, ...state.future]
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    return {
      past: [...state.past, state.project],
      project: next,
      future: newFuture
    };
  }),

  addPlane: () =>
    set((state) => {
      const newPlane = createDefaultPlane(`Plane ${state.project.planes.length + 1}`, 1.0);
      return {
        past: [...state.past, state.project],
        future: [],
        project: {
          ...state.project,
          planes: [newPlane, ...state.project.planes],
        },
        selectedPlaneId: newPlane.id,
      };
    }),

  deletePlane: (id) =>
    set((state) => {
      const newPlanes = state.project.planes.filter((p) => p.id !== id);
      return {
        past: [...state.past, state.project],
        future: [],
        project: {
          ...state.project,
          planes: newPlanes,
        },
        selectedPlaneId: state.selectedPlaneId === id ? (newPlanes[0]?.id ?? null) : state.selectedPlaneId,
      };
    }),

  updatePlane: (id, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        planes: state.project.planes.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      },
    })),

  reorderPlanes: (startIndex, endIndex) =>
    set((state) => {
      const result = Array.from(state.project.planes);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return {
        past: [...state.past, state.project],
        future: [],
        project: {
          ...state.project,
          planes: result,
        },
      };
    }),

  selectPlane: (id) => set({ selectedPlaneId: id }),

  // Strokes Management
  addStroke: (planeId, stroke) =>
    set((state) => {
      const existingStrokesInPlane = state.project.planes.find(p => p.id === planeId)?.strokes || [];
      const strokeCount = existingStrokesInPlane.length + 1;
      const strokeWithName = {
        ...stroke,
        name: stroke.name || `Stroke ${strokeCount}`,
        visible: stroke.visible !== false
      };
      
      return {
        past: [...state.past, state.project],
        future: [],
        project: {
          ...state.project,
          planes: state.project.planes.map((p) =>
            p.id === planeId ? { ...p, strokes: [...p.strokes, strokeWithName] } : p
          ),
        },
      };
    }),

  removeStrokes: (planeId, strokeIds) =>
    set((state) => ({
      project: {
        ...state.project,
        planes: state.project.planes.map((p) =>
          p.id === planeId ? { ...p, strokes: p.strokes.filter(s => !strokeIds.includes(s.id)) } : p
        ),
      },
    })),

  deleteStroke: (planeId, strokeId) =>
    set((state) => ({
      past: [...state.past, state.project],
      future: [],
      project: {
        ...state.project,
        planes: state.project.planes.map((p) =>
          p.id === planeId ? { ...p, strokes: p.strokes.filter(s => s.id !== strokeId) } : p
        ),
      },
      selectedStrokeId: state.selectedStrokeId === strokeId ? null : state.selectedStrokeId,
    })),

  renameStroke: (planeId, strokeId, name) =>
    set((state) => ({
      project: {
        ...state.project,
        planes: state.project.planes.map((p) =>
          p.id === planeId
            ? {
                ...p,
                strokes: p.strokes.map((s) => (s.id === strokeId ? { ...s, name } : s)),
              }
            : p
        ),
      },
    })),

  toggleStrokeVisibility: (planeId, strokeId) =>
    set((state) => ({
      project: {
        ...state.project,
        planes: state.project.planes.map((p) =>
          p.id === planeId
            ? {
                ...p,
                strokes: p.strokes.map((s) =>
                  s.id === strokeId ? { ...s, visible: !(s.visible !== false) } : s
                ),
              }
            : p
        ),
      },
    })),

  updateStroke: (planeId, strokeId, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        planes: state.project.planes.map((p) =>
          p.id === planeId
            ? {
                ...p,
                strokes: p.strokes.map((s) => (s.id === strokeId ? { ...s, ...updates } : s)),
              }
            : p
        ),
      },
    })),

  duplicateStroke: (planeId, strokeId) =>
    set((state) => {
      const plane = state.project.planes.find(p => p.id === planeId);
      if (!plane) return state;
      const stroke = plane.strokes.find(s => s.id === strokeId);
      if (!stroke) return state;

      const newId = uuidv4();
      const duplicatedStroke: Stroke = {
        ...stroke,
        id: newId,
        name: `${stroke.name || 'Tracé'} (Copie)`,
        points: stroke.points.map(pt => ({ x: pt.x + 20, y: pt.y + 20 }))
      };

      return {
        past: [...state.past, state.project],
        future: [],
        project: {
          ...state.project,
          planes: state.project.planes.map((p) =>
            p.id === planeId ? { ...p, strokes: [...p.strokes, duplicatedStroke] } : p
          ),
        },
        selectedStrokeId: newId
      };
    }),

  reorderStrokes: (planeId, startIndex, endIndex) =>
    set((state) => {
      const plane = state.project.planes.find((p) => p.id === planeId);
      if (!plane) return state;
      const result = Array.from(plane.strokes);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return {
        past: [...state.past, state.project],
        future: [],
        project: {
          ...state.project,
          planes: state.project.planes.map((p) =>
            p.id === planeId ? { ...p, strokes: result } : p
          ),
        },
      };
    }),

  // Groups Management
  createStrokeGroup: (planeId, name) =>
    set((state) => {
      const newGroup: StrokeGroup = {
        id: uuidv4(),
        name,
        visible: true,
        expanded: true,
      };
      return {
        past: [...state.past, state.project],
        future: [],
        project: {
          ...state.project,
          planes: state.project.planes.map((p) =>
            p.id === planeId
              ? {
                  ...p,
                  groups: [...(p.groups || []), newGroup],
                }
              : p
          ),
        },
      };
    }),

  renameStrokeGroup: (planeId, groupId, name) =>
    set((state) => ({
      project: {
        ...state.project,
        planes: state.project.planes.map((p) =>
          p.id === planeId
            ? {
                ...p,
                groups: (p.groups || []).map((g) => (g.id === groupId ? { ...g, name } : g)),
              }
            : p
        ),
      },
    })),

  toggleStrokeGroupVisibility: (planeId, groupId) =>
    set((state) => ({
      project: {
        ...state.project,
        planes: state.project.planes.map((p) =>
          p.id === planeId
            ? {
                ...p,
                groups: (p.groups || []).map((g) =>
                  g.id === groupId ? { ...g, visible: !g.visible } : g
                ),
              }
            : p
        ),
      },
    })),

  deleteStrokeGroup: (planeId, groupId) =>
    set((state) => ({
      past: [...state.past, state.project],
      future: [],
      project: {
        ...state.project,
        planes: state.project.planes.map((p) =>
          p.id === planeId
            ? {
                ...p,
                groups: (p.groups || []).filter((g) => g.id !== groupId),
                strokes: p.strokes.map((s) => (s.groupId === groupId ? { ...s, groupId: undefined } : s)),
              }
            : p
        ),
      },
    })),

  addStrokeToGroup: (planeId, strokeId, groupId) =>
    set((state) => ({
      project: {
        ...state.project,
        planes: state.project.planes.map((p) =>
          p.id === planeId
            ? {
                ...p,
                strokes: p.strokes.map((s) => (s.id === strokeId ? { ...s, groupId: groupId || undefined } : s)),
              }
            : p
        ),
      },
    })),

  clearAllStrokes: () =>
    set((state) => ({
      past: [...state.past, state.project],
      future: [],
      project: {
        ...state.project,
        planes: state.project.planes.map((p) => ({
          ...p,
          strokes: [],
          groups: [],
        })),
      },
    })),

  setProject: (project) =>
    set({
      project: {
        ...project,
        gridSize: project.gridSize ?? 20,
        gridEnabled: project.gridEnabled ?? false,
        gridRoundness: project.gridRoundness ?? 80,
        gridColor: project.gridColor ?? '#cccccc',
        gridOpacity: project.gridOpacity ?? 0.5,
        gridSnapEnabled: project.gridSnapEnabled ?? false,
        gridSnapMode: project.gridSnapMode ?? 'straight',
        gridSnapRoundness: project.gridSnapRoundness ?? 100,
        dofEnabled: project.dofEnabled ?? false,
        focalPlaneId: project.focalPlaneId ?? null,
        focalRange: project.focalRange ?? 1.0,
      },
      selectedPlaneId: project.planes[0]?.id ?? null,
      past: [],
      future: [],
    }),
}));
