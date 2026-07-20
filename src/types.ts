export type AppPoint = { x: number; y: number };

export type Stroke = {
  id: string;
  name?: string;
  points: AppPoint[];
  color: string;
  fillColor?: string;
  thickness: number;
  tool: 'brush' | 'eraser' | 'fill';
  visible?: boolean;
  groupId?: string;
  fillStrokeThickness?: number;
  smoothing?: number;
  gridSnapRoundness?: number;
};

export type StrokeGroup = {
  id: string;
  name: string;
  visible: boolean;
  expanded?: boolean;
};

export type Plane = {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  parallaxX: number; // 1.0 = foreground, smaller = background
  parallaxY: number; 
  blendMode?: string;
  blur?: number;
  strokes: Stroke[];
  groups?: StrokeGroup[];
};

export type Project = {
  id: string;
  name: string;
  width: number; // Base loop width, e.g., 2048
  height: number;
  backgroundColor: string;
  gridSize: number;
  gridEnabled: boolean;
  gridRoundness: number;
  gridColor: string;
  gridOpacity: number;
  gridSnapEnabled: boolean;
  gridSnapMode?: 'straight' | 'freehand';
  gridSnapRoundness?: number;
  dofEnabled?: boolean;
  focalPlaneId?: string | null;
  focalRange?: number;
  planes: Plane[];
};
