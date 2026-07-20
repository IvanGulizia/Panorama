import { Application, Container, Graphics, GraphicsContext, Ticker, Point as PixiPoint, EventSystem, AlphaFilter, BlurFilter } from 'pixi.js';
import 'pixi.js/advanced-blend-modes';
import { Project, Plane, Stroke, AppPoint } from '../types';
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid';

export class Engine {
  public app: Application;
  private project: Project;
  
  // Containers
  private rootContainer: Container;
  private planesContainer: Container;
  private gridGraphics: Graphics;
  private planeMap: Map<string, {
    container: Container;
    context: GraphicsContext;
    left: Graphics;
    center: Graphics;
    right: Graphics;
    blurFilter: BlurFilter;
  }> = new Map();

  // Interaction state
  private isDrawing = false;
  private currentStroke: Stroke | null = null;
  private lastPos: AppPoint | null = null;
  private keys: Set<string> = new Set();
  
  // Selection and dragging state
  private selectedStrokeId: string | null = null;
  private isDraggingStroke = false;
  private dragStrokeStartPoints: AppPoint[] = [];
  private dragStrokeStartPos: AppPoint = { x: 0, y: 0 };
  
  // Camera state
  private cameraX = 0;
  private cameraY = 0;
  private zoom = 1;
  private isDragging = false;
  private dragStart: PixiPoint | null = null;
  private cameraStart: {x: number, y: number} | null = null;

  // Inertia for play mode
  private velocityX = 0;
  private lastDragX = 0;
  
  // Auto-pan state
  private pointerGlobal: { x: number, y: number } | null = null;
  private autoPanSpeedX = 0;
  private unsubscribe: (() => void) | null = null;
  private activePointerId: number | null = null;
  private resizeObserver?: ResizeObserver;
  private isDestroyed: boolean = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.app = new Application();
    this.project = useStore.getState().project;
    
    // Listen for reset view event
    window.addEventListener('panoramix:reset-view', this.onResetView.bind(this));
  }

  private onResetView = () => {
    this.cameraX = 0;
    this.cameraY = 0;
    this.zoom = 1;
    // Notify store if needed, or just let PIXI render it
  };

  public async init() {
    await this.app.init({
      canvas: this.canvas,
      resizeTo: this.canvas.parentElement || window,
      backgroundColor: this.project.backgroundColor || '#ffffff',
      antialias: true,
      resolution: Math.max(window.devicePixelRatio, 2),
      autoDensity: true,
    });
    
    if (this.isDestroyed) return;

    this.rootContainer = new Container();
    this.planesContainer = new Container();
    this.gridGraphics = new Graphics();
    this.rootContainer.addChild(this.gridGraphics);
    this.rootContainer.addChild(this.planesContainer);
    this.app.stage.addChild(this.rootContainer);

    if (this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.app && this.app.renderer) {
          this.app.resize();
        }
      });
      this.resizeObserver.observe(this.canvas.parentElement);
    }

    this.setupInteraction();
    this.buildScene();

    // Setup update loop
    this.app.ticker.add(this.update.bind(this));

    // Subscribe to store changes
    this.unsubscribe = useStore.subscribe((state) => {
      this.handleStateChange(state);
    });
  }

  private handleStateChange(state: any) {
    if (this.isDestroyed) return;
    
    try {
      // Update camera zoom based on state if changed
      if (state.zoom !== this.zoom) {
        this.zoom = state.zoom;
      }

      const selectedStrokeChanged = state.selectedStrokeId !== this.selectedStrokeId;
      const oldSelectedStrokeId = this.selectedStrokeId;
      if (selectedStrokeChanged) {
        this.selectedStrokeId = state.selectedStrokeId;
      }
      
      // Check if project changed or selection changed
      if (this.project !== state.project || selectedStrokeChanged) {
        const oldProject = this.project;
        this.project = state.project;
        
        if (this.project && oldProject && this.project.backgroundColor !== oldProject.backgroundColor) {
          if (this.app && this.app.renderer && this.app.renderer.background) {
            this.app.renderer.background.color = this.project.backgroundColor;
          }
        }
        
        // Sync planes
        const currentIds = new Set(this.project.planes.map(p => p.id));
        
        // Remove deleted
        for (const [id, planeData] of this.planeMap.entries()) {
          if (!currentIds.has(id)) {
            if (this.planesContainer && planeData && planeData.container) {
              this.planesContainer.removeChild(planeData.container);
              planeData.container.destroy({ children: true });
            }
            this.planeMap.delete(id);
          }
        }
        
        // Add or update
        this.project.planes.forEach((plane, index) => {
          let planeData = this.planeMap.get(plane.id);
          if (!planeData) {
            planeData = this.createPlane(plane);
            this.planeMap.set(plane.id, planeData);
            if (this.planesContainer && planeData && planeData.container) {
              this.planesContainer.addChild(planeData.container);
            }
          }
          
          if (planeData) {
            // Update properties
            this.syncPlaneProperties(plane, planeData, index);
            
            // Check if strokes changed
            const oldPlane = oldProject && oldProject.planes ? oldProject.planes.find(p => p.id === plane.id) : undefined;
            
            // We must redraw this plane if:
            // 1. Strokes changed, visibility changed, or plane was added
            // 2. Or if selection changed and this plane contains either the old selected stroke or the new selected stroke
            const containsOldSelected = oldSelectedStrokeId ? plane.strokes.some(s => s.id === oldSelectedStrokeId) : false;
            const containsNewSelected = this.selectedStrokeId ? plane.strokes.some(s => s.id === this.selectedStrokeId) : false;
            
            const shouldRedraw = !oldPlane || 
                                 oldPlane.strokes !== plane.strokes || 
                                 oldPlane.visible !== plane.visible ||
                                 (selectedStrokeChanged && (containsOldSelected || containsNewSelected));
                                 
            if (shouldRedraw) {
              this.redrawPlane(plane, planeData.context);
            }
          }
        });
        
        // Sort by zIndex
        if (this.planesContainer) {
          this.planesContainer.sortChildren();
        }
      }
    } catch (error) {
      console.warn("Error handling state change in PixiApp:", error);
    }
  }

  private syncPlaneProperties(plane: Plane, planeData: any, index: number) {
    if (!planeData) return;
    try {
      if (planeData.container) {
        planeData.container.zIndex = this.project.planes.length - index;
        planeData.container.alpha = plane.visible ? plane.opacity : 0;
      }

      if (planeData.left) planeData.left.blendMode = 'normal';
      if (planeData.center) planeData.center.blendMode = 'normal';
      if (planeData.right) planeData.right.blendMode = 'normal';

      let targetBlur = plane.blur ?? 0;
      if (this.project.dofEnabled && this.project.focalPlaneId) {
        const focalPlane = this.project.planes.find(p => p.id === this.project.focalPlaneId);
        if (focalPlane) {
          const focalRange = this.project.focalRange ?? 1.0;
          const distance = Math.abs(plane.parallaxX - focalPlane.parallaxX);
          const dofBlur = distance * focalRange * 30;
          targetBlur += dofBlur;
        }
      }

      if (planeData.blurFilter) {
        planeData.blurFilter.blur = targetBlur;
      }

      const blend = (plane.blendMode || 'normal') as any;
      if (planeData.container && planeData.blurFilter) {
        if (targetBlur > 0) {
          // In PixiJS v8, setting a non-normal blendMode directly on a Container with active filters
          // causes a crash ("Cannot read properties of null (reading '2')").
          // We safely bypass this by applying the blendMode to the Filter itself.
          planeData.container.filters = [planeData.blurFilter];
          planeData.container.blendMode = 'normal';
          planeData.blurFilter.blendMode = blend;
        } else {
          // Clear filters completely to optimize performance and apply blendMode directly on Container
          planeData.container.filters = null;
          planeData.container.blendMode = blend;
        }
      }
    } catch (error) {
      console.warn("Error syncing plane properties in PixiApp:", error);
    }
  }

  private createPlane(plane: Plane) {
    const container = new Container();
    const context = new GraphicsContext();
    
    // Shared graphics geometry!
    const left = new Graphics(context);
    const center = new Graphics(context);
    const right = new Graphics(context);
    
    left.x = -this.project.width;
    center.x = 0;
    right.x = this.project.width;
    
    container.addChild(left, center, right);
    
    const blurFilter = new BlurFilter({ strength: 0, quality: 10, resolution: Math.max(window.devicePixelRatio || 1, 2) });
    // Filters managed dynamically by syncPlaneProperties to avoid v8 blendMode crashes
    
    this.redrawPlane(plane, context);
    
    return { container, context, left, center, right, blurFilter };
  }

  private redrawPlane(plane: Plane, context: GraphicsContext) {
    if (!context) return;
    try {
      context.clear();
      
      // Force bounds to project dimensions so blur and fills don't produce edge artifacts
      // while keeping the texture size small enough to avoid WebGL OOM
      context.rect(0, 0, this.project.width, this.project.height);
      context.fill({ color: '#000000', alpha: 0 });
      
      if (plane.strokes) {
        for (const stroke of plane.strokes) {
          if (stroke.visible !== false) {
            const isSelected = stroke.id === this.selectedStrokeId;
            this.drawStrokeToContext(stroke, context, isSelected);
          }
        }
      }

      // Draw active stroke preview if any
      const state = useStore.getState();
      if (this.currentStroke && state.selectedPlaneId === plane.id) {
        this.drawStrokeToContext(this.currentStroke, context, false);
      }
    } catch (error) {
      console.warn("Error in redrawPlane in PixiApp:", error);
    }
  }

  private drawSmoothPath(points: AppPoint[], context: GraphicsContext, isFill: boolean = false, gridSnapRoundness?: number) {
    if (points.length === 0) return;
    
    context.beginPath();
    
    if (points.length === 1) {
      context.moveTo(points[0].x, points[0].y);
      context.lineTo(points[0].x + 0.1, points[0].y);
      return;
    }

    if (gridSnapRoundness !== undefined) {
      if (isFill) {
        // Filter out duplicate or too close points for a closed polygon
        let filteredPoints: AppPoint[] = [];
        for (const p of points) {
          if (filteredPoints.length === 0) {
            filteredPoints.push(p);
          } else {
            const last = filteredPoints[filteredPoints.length - 1];
            if (Math.hypot(p.x - last.x, p.y - last.y) > 0.5) {
              filteredPoints.push(p);
            }
          }
        }
        // Also check start/end
        if (filteredPoints.length > 2) {
          const first = filteredPoints[0];
          const last = filteredPoints[filteredPoints.length - 1];
          if (Math.hypot(last.x - first.x, last.y - first.y) < 0.5) {
            filteredPoints.pop();
          }
        }

        const N = filteredPoints.length;
        if (N < 3) {
          context.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            context.lineTo(points[i].x, points[i].y);
          }
          return;
        }

        const d = new Array(N).fill(0);
        for (let i = 0; i < N; i++) {
          const nextIdx = (i + 1) % N;
          d[i] = Math.hypot(filteredPoints[nextIdx].x - filteredPoints[i].x, filteredPoints[nextIdx].y - filteredPoints[i].y);
        }

        const T = new Array(N).fill(0);
        const R = new Array(N).fill(0);

        for (let i = 0; i < N; i++) {
          const prevIdx = (i - 1 + N) % N;
          const nextIdx = (i + 1) % N;

          const ux = filteredPoints[prevIdx].x - filteredPoints[i].x;
          const uy = filteredPoints[prevIdx].y - filteredPoints[i].y;
          const vx = filteredPoints[nextIdx].x - filteredPoints[i].x;
          const vy = filteredPoints[nextIdx].y - filteredPoints[i].y;

          const d_prev = d[prevIdx];
          const d_next = d[i];

          if (d_prev === 0 || d_next === 0) continue;

          const dot = ux * vx + uy * vy;
          const cosTheta = Math.max(-1, Math.min(1, dot / (d_prev * d_next)));
          const theta = Math.acos(cosTheta);

          const halfTheta = theta / 2;
          const tanHalf = Math.tan(halfTheta);

          if (tanHalf > 0.001) {
            T[i] = Math.min(d_prev, d_next) * 0.5 * (gridSnapRoundness / 100);
          }
        }

        // Adjust T to prevent overlap on any segment in the closed loop
        for (let i = 0; i < N; i++) {
          const nextIdx = (i + 1) % N;
          const sum = T[i] + T[nextIdx];
          const segmentLength = d[i];
          if (sum > segmentLength && sum > 0) {
            const scale = segmentLength / sum;
            T[i] *= scale;
            T[nextIdx] *= scale;
          }
        }

        // Calculate radii R
        for (let i = 0; i < N; i++) {
          const prevIdx = (i - 1 + N) % N;
          const nextIdx = (i + 1) % N;

          const ux = filteredPoints[prevIdx].x - filteredPoints[i].x;
          const uy = filteredPoints[prevIdx].y - filteredPoints[i].y;
          const vx = filteredPoints[nextIdx].x - filteredPoints[i].x;
          const vy = filteredPoints[nextIdx].y - filteredPoints[i].y;

          const d_prev = d[prevIdx];
          const d_next = d[i];

          if (d_prev === 0 || d_next === 0) continue;

          const dot = ux * vx + uy * vy;
          const cosTheta = Math.max(-1, Math.min(1, dot / (d_prev * d_next)));
          const theta = Math.acos(cosTheta);

          const halfTheta = theta / 2;
          const tanHalf = Math.tan(halfTheta);

          if (tanHalf > 0.001) {
            let r = T[i] / tanHalf;
            // Cap the radius to prevent huge arcs on extremely sharp corners
            const maxRadius = T[i] * 2.0;
            if (r > maxRadius) {
              r = maxRadius;
            }
            R[i] = r;
          } else {
            R[i] = 0;
          }
        }

        // Start drawing from the midpoint of the last segment to the first vertex
        const startPt = {
          x: (filteredPoints[N - 1].x + filteredPoints[0].x) / 2,
          y: (filteredPoints[N - 1].y + filteredPoints[0].y) / 2
        };
        context.moveTo(startPt.x, startPt.y);

        for (let i = 0; i < N; i++) {
          const nextIdx = (i + 1) % N;
          if (R[i] > 0) {
            context.arcTo(filteredPoints[i].x, filteredPoints[i].y, filteredPoints[nextIdx].x, filteredPoints[nextIdx].y, R[i]);
          } else {
            context.lineTo(filteredPoints[i].x, filteredPoints[i].y);
          }
        }
        context.lineTo(startPt.x, startPt.y);

      } else {
        // Open Path (Brush) with grid snap rounding
        if (points.length <= 2) {
          context.moveTo(points[0].x, points[0].y);
          if (points.length === 2) {
            context.lineTo(points[1].x, points[1].y);
          }
          return;
        }

        const N = points.length;
        const T = new Array(N).fill(0);
        const R = new Array(N).fill(0);
        const d = new Array(N - 1).fill(0);

        for (let i = 0; i < N - 1; i++) {
          d[i] = Math.hypot(points[i+1].x - points[i].x, points[i+1].y - points[i].y);
        }

        for (let i = 1; i < N - 1; i++) {
          const ux = points[i-1].x - points[i].x;
          const uy = points[i-1].y - points[i].y;
          const vx = points[i+1].x - points[i].x;
          const vy = points[i+1].y - points[i].y;
          
          const d_prev = d[i-1];
          const d_next = d[i];
          
          if (d_prev === 0 || d_next === 0) continue;
          
          const dot = ux * vx + uy * vy;
          const cosTheta = Math.max(-1, Math.min(1, dot / (d_prev * d_next)));
          const theta = Math.acos(cosTheta);
          
          const halfTheta = theta / 2;
          const tanHalf = Math.tan(halfTheta);
          
          if (tanHalf > 0.001) {
            T[i] = Math.min(d_prev, d_next) * 0.5 * (gridSnapRoundness / 100);
          }
        }

        // Adjust T to prevent overlap on any segment
        for (let i = 1; i < N - 2; i++) {
          const sum = T[i] + T[i+1];
          const segmentLength = d[i];
          if (sum > segmentLength && sum > 0) {
            const scale = segmentLength / sum;
            T[i] *= scale;
            T[i+1] *= scale;
          }
        }

        // Calculate radii R
        for (let i = 1; i < N - 1; i++) {
          const ux = points[i-1].x - points[i].x;
          const uy = points[i-1].y - points[i].y;
          const vx = points[i+1].x - points[i].x;
          const vy = points[i+1].y - points[i].y;
          
          const d_prev = d[i-1];
          const d_next = d[i];
          
          if (d_prev === 0 || d_next === 0) continue;
          
          const dot = ux * vx + uy * vy;
          const cosTheta = Math.max(-1, Math.min(1, dot / (d_prev * d_next)));
          const theta = Math.acos(cosTheta);
          
          const halfTheta = theta / 2;
          const tanHalf = Math.tan(halfTheta);
          
          if (tanHalf > 0.001) {
            let r = T[i] / tanHalf;
            // Cap the radius to prevent huge arcs on extremely sharp corners
            const maxRadius = T[i] * 2.0;
            if (r > maxRadius) {
              r = maxRadius;
            }
            R[i] = r;
          } else {
            R[i] = 0;
          }
        }

        context.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < N - 1; i++) {
          if (R[i] > 0) {
            context.arcTo(points[i].x, points[i].y, points[i+1].x, points[i+1].y, R[i]);
          } else {
            context.lineTo(points[i].x, points[i].y);
          }
        }
        context.lineTo(points[N - 1].x, points[N - 1].y);
      }
    } else {
      // Normal stroke (no snap/roundness specified)
      if (isFill) {
        context.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          context.lineTo(points[i].x, points[i].y);
        }
      } else {
        context.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          context.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        context.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      }
    }
  }

  private drawStrokeToContext(stroke: Stroke, context: GraphicsContext, isSelected: boolean = false) {
    if (stroke.points.length === 0) return;
    
    this.drawSmoothPath(stroke.points, context, stroke.tool === 'fill', stroke.gridSnapRoundness);
    
    if (stroke.tool === 'fill') {
      context.closePath();
      context.fill({ color: stroke.fillColor ?? stroke.color });
      const thickness = stroke.fillStrokeThickness ?? stroke.thickness;
      if (thickness > 0) {
        context.stroke({ color: stroke.color, width: thickness, cap: 'round', join: 'round' });
      }
    } else {
      context.stroke({ color: stroke.color, width: stroke.thickness, cap: 'round', join: 'round' });
    }

    if (isSelected) {
      // 1. Path highlight glow (semi-transparent bright blue outline)
      context.beginPath();
      this.drawSmoothPath(stroke.points, context, stroke.tool === 'fill', stroke.gridSnapRoundness);
      if (stroke.tool === 'fill') {
        context.closePath();
      }
      context.stroke({ color: '#3b82f6', width: Math.max(3, stroke.thickness + 5), cap: 'round', join: 'round', alpha: 0.45 });
      context.stroke({ color: '#ffffff', width: 1.5, cap: 'round', join: 'round', alpha: 0.9 });

      // 2. Bounding Box and Corner handles
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      stroke.points.forEach(pt => {
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      });

      if (minX !== Infinity) {
        const padding = 6;
        const bMinX = minX - padding;
        const bMinY = minY - padding;
        const bMaxX = maxX + padding;
        const bMaxY = maxY + padding;
        const width = bMaxX - bMinX;
        const height = bMaxY - bMinY;

        // Bounding box rect
        context.beginPath();
        context.rect(bMinX, bMinY, width, height);
        context.stroke({ color: '#3b82f6', width: 1.2, alpha: 0.8 });
        context.fill({ color: '#3b82f6', alpha: 0.05 });

        // Handles
        const corners = [
          { x: bMinX, y: bMinY },
          { x: bMaxX, y: bMinY },
          { x: bMaxX, y: bMaxY },
          { x: bMinX, y: bMaxY },
          { x: bMinX + width / 2, y: bMinY },
          { x: bMaxX, y: bMinY + height / 2 },
          { x: bMinX + width / 2, y: bMaxY },
          { x: bMinX, y: bMinY + height / 2 }
        ];

        corners.forEach(corner => {
          context.beginPath();
          context.circle(corner.x, corner.y, 4.5);
          context.fill({ color: '#ffffff' });
          context.stroke({ color: '#3b82f6', width: 1.5 });
        });
      }
    }
  }

  private buildScene() {
    try {
      if (this.planesContainer) {
        this.planesContainer.sortableChildren = true;
      }
      this.project.planes.forEach((plane, index) => {
        const p = this.createPlane(plane);
        if (p) {
          this.syncPlaneProperties(plane, p, index);
          this.planeMap.set(plane.id, p);
          if (this.planesContainer && p.container) {
            this.planesContainer.addChild(p.container);
          }
        }
      });
    } catch (error) {
      console.warn("Error building scene in PixiApp:", error);
    }
  }

  private setupInteraction() {
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = { contains: () => true }; // Infinite hit area
    
    this.app.stage.on('pointerdown', this.onPointerDown, this);
    this.app.stage.on('pointermove', this.onPointerMove, this);
    this.app.stage.on('pointerup', this.onPointerUp, this);
    this.app.stage.on('pointerupoutside', this.onPointerUp, this);
    
    // Wheel for pan/zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const state = useStore.getState();
      
      if (state.zoomEnabled) {
        if (state.mode === 'draw') {
          const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
          const newZoom = Math.max(0.1, Math.min(this.zoom * scaleFactor, 5));
          state.setZoom(newZoom);
        }
      } else {
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        this.cameraX += delta / this.zoom;
      }
    });

    // Keyboard panning & tool shortcuts
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
      }
      
      const state = useStore.getState();
      if (state.mode === 'draw') {
        const key = e.key.toLowerCase();
        if (key === 'v') {
          state.setTool('select');
        } else if (key === 'b') {
          state.setTool('brush');
        } else if (key === 'e') {
          state.setTool('eraser');
        } else if (key === 'f') {
          state.setTool('fill');
        }
      }
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  private onPointerDown(e: any) {
    const pointerId = e.pointerId ?? 0;
    if (this.activePointerId !== null && this.activePointerId !== pointerId) return;
    this.activePointerId = pointerId;

    const state = useStore.getState();
    const pos = e.global;
    
    if (state.mode === 'play') {
      this.isDragging = true;
      this.dragStart = new PixiPoint(pos.x, pos.y);
      this.cameraStart = { x: this.cameraX, y: this.cameraY };
      this.velocityX = 0;
      this.lastDragX = pos.x;
      return;
    }
    
    if (state.mode === 'draw') {
      if (e.button === 1 || e.button === 2 || state.tool === 'pan') {
        this.isDragging = true;
        this.dragStart = new PixiPoint(pos.x, pos.y);
        this.cameraStart = { x: this.cameraX, y: this.cameraY };
        return;
      }
      
      const planeId = state.selectedPlaneId;
      if (!planeId) return;
      
      const plane = this.project.planes.find(p => p.id === planeId);
      if (!plane || !plane.visible) return;
      
      const localPos = this.getGlobalToPlane(pos.x, pos.y, plane);

      if (state.tool === 'select') {
        // 1. Try to hit-test strokes of the CURRENT plane first (from top to bottom)
        let hitStroke: Stroke | null = null;
        let foundPlaneId = planeId;
        const threshold = 12; // pixels tolerance for clicking near thin lines
        
        const checkStrokeHit = (stroke: Stroke, x: number, y: number) => {
          if (stroke.visible === false) return false;
          
          if (stroke.tool === 'fill') {
            if (this.pointInPolygon({ x, y }, stroke.points)) {
              return true;
            }
            // Check fill border
            const contourThickness = stroke.fillStrokeThickness ?? stroke.thickness ?? 2;
            const radius = (contourThickness / 2) + threshold;
            const radiusSq = radius * radius;
            for (let i = 0; i < stroke.points.length - 1; i++) {
              if (this.distToSegmentSquared({ x, y }, stroke.points[i], stroke.points[i+1]) <= radiusSq) {
                return true;
              }
            }
          } else {
            const radius = (stroke.thickness / 2) + threshold;
            const radiusSq = radius * radius;
            if (stroke.points.length === 1) {
              const distSq = (stroke.points[0].x - x) ** 2 + (stroke.points[0].y - y) ** 2;
              if (distSq <= radiusSq) return true;
            } else {
              for (let i = 0; i < stroke.points.length - 1; i++) {
                if (this.distToSegmentSquared({ x, y }, stroke.points[i], stroke.points[i+1]) <= radiusSq) {
                  return true;
                }
              }
            }
          }
          return false;
        };
        
        // Check active plane strokes (most recently drawn first)
        const activeStrokesReversed = [...plane.strokes].reverse();
        for (const stroke of activeStrokesReversed) {
          if (checkStrokeHit(stroke, localPos.x, localPos.y)) {
            hitStroke = stroke;
            break;
          }
        }
        
        // 2. If nothing hit on active plane, check other visible planes!
        if (!hitStroke) {
          for (const otherPlane of this.project.planes) {
            if (otherPlane.id === planeId || !otherPlane.visible) continue;
            
            const otherLocalPos = this.getGlobalToPlane(pos.x, pos.y, otherPlane);
            const otherStrokesReversed = [...otherPlane.strokes].reverse();
            
            for (const stroke of otherStrokesReversed) {
              if (checkStrokeHit(stroke, otherLocalPos.x, otherLocalPos.y)) {
                hitStroke = stroke;
                foundPlaneId = otherPlane.id;
                break;
              }
            }
            if (hitStroke) break;
          }
        }
        
        if (hitStroke) {
          // Select plane and stroke
          state.selectPlane(foundPlaneId);
          state.setSelectedStrokeId(hitStroke.id);
          
          // Start dragging!
          this.isDraggingStroke = true;
          
          // We need the local position relative to the found plane
          const foundPlane = this.project.planes.find(p => p.id === foundPlaneId)!;
          const foundLocalPos = this.getGlobalToPlane(pos.x, pos.y, foundPlane);
          
          this.dragStrokeStartPoints = hitStroke.points.map(pt => ({ ...pt }));
          this.dragStrokeStartPos = { x: foundLocalPos.x, y: foundLocalPos.y };
          
          // Save undo state before dragging
          state.commit();
        } else {
          // Clear selection if clicked on empty space
          state.setSelectedStrokeId(null);
        }
        return;
      }

      const planeData = this.planeMap.get(planeId);
      if (!planeData) return;
      
      this.isDrawing = true;

      if (state.tool === 'eraser') {
        state.commit();
        if (state.eraserMode === 'classic') {
          this.eraseAtClassic(localPos.x, localPos.y, planeId, state.brushSize);
        } else {
          this.eraseAt(localPos.x, localPos.y, planeId, state.brushSize);
        }
        this.lastPos = localPos;
      } else {
        // Start drawing
        const snapEnabled = state.project.gridSnapEnabled && state.project.gridEnabled;
        this.currentStroke = {
          id: uuidv4(),
          points: [{ x: localPos.x, y: localPos.y }],
          color: state.color,
          fillColor: state.tool === 'fill' ? state.fillColor : undefined,
          thickness: state.brushSize,
          tool: state.tool,
          smoothing: state.strokeSmoothing,
          fillStrokeThickness: state.fillStrokeThickness,
          gridSnapRoundness: snapEnabled ? (state.project.gridSnapRoundness ?? 100) : undefined
        };
        this.lastPos = localPos;
        this.redrawPlane(plane, planeData.context);
      }
    }
  }

  private pointInPolygon(point: {x: number, y: number}, vs: {x: number, y: number}[]) {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      let xi = vs[i].x, yi = vs[i].y;
      let xj = vs[j].x, yj = vs[j].y;
      let intersect = ((yi > y) != (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private eraseAt(x: number, y: number, planeId: string, eraserSize: number) {
    const state = useStore.getState();
    const plane = state.project.planes.find(p => p.id === planeId);
    if (!plane) return;

    const hitRadius = eraserSize / 2;
    const strokesToRemove: string[] = [];

    // Simple point-to-segment distance check for all strokes
    for (const stroke of plane.strokes) {
      const strokeRadius = stroke.thickness / 2;
      const threshold = hitRadius + strokeRadius;
      
      let hit = false;
      
      if (stroke.tool === 'fill') {
        if (this.pointInPolygon({x, y}, stroke.points)) {
          hit = true;
        }
      }

      if (!hit) {
        if (stroke.points.length === 1) {
          const pt = stroke.points[0];
          const dist = Math.hypot(pt.x - x, pt.y - y);
          if (dist < threshold) hit = true;
        } else {
          for (let i = 0; i < stroke.points.length - 1; i++) {
            const p1 = stroke.points[i];
            const p2 = stroke.points[i+1];
            const distSq = this.distToSegmentSquared({x, y}, p1, p2);
            if (distSq < threshold * threshold) {
              hit = true;
              break;
            }
          }
        }
      }

      if (hit) {
        strokesToRemove.push(stroke.id);
      }
    }

    if (strokesToRemove.length > 0) {
      state.removeStrokes(planeId, strokesToRemove);
      this.project = useStore.getState().project; // update local ref
      
      const updatedPlane = this.project.planes.find(p => p.id === planeId);
      const planeData = this.planeMap.get(planeId);
      if (updatedPlane && planeData) {
        this.redrawPlane(updatedPlane, planeData.context);
      }
    }
  }

  private eraseAtClassic(x: number, y: number, planeId: string, eraserSize: number) {
    const state = useStore.getState();
    const plane = state.project.planes.find(p => p.id === planeId);
    if (!plane) return;

    const hitRadius = eraserSize / 2;
    let strokesChanged = false;
    const newStrokes: Stroke[] = [];

    for (const stroke of plane.strokes) {
      if (stroke.tool === 'fill') {
        let hit = false;
        if (this.pointInPolygon({x, y}, stroke.points)) {
          hit = true;
        } else {
          for (let i = 0; i < stroke.points.length - 1; i++) {
            const p1 = stroke.points[i];
            const p2 = stroke.points[i+1];
            const distSq = this.distToSegmentSquared({x, y}, p1, p2);
            if (distSq < hitRadius * hitRadius) {
              hit = true;
              break;
            }
          }
        }
        
        if (hit) {
          strokesChanged = true;
        } else {
          newStrokes.push(stroke);
        }
        continue;
      }

      let currentSegment: AppPoint[] = [];
      const segments: AppPoint[][] = [];

      for (const pt of stroke.points) {
        const dist = Math.hypot(pt.x - x, pt.y - y);
        if (dist > hitRadius) {
          currentSegment.push(pt);
        } else {
          if (currentSegment.length > 0) {
            segments.push(currentSegment);
            currentSegment = [];
          }
        }
      }

      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }

      if (segments.length === 1 && segments[0].length === stroke.points.length) {
        newStrokes.push(stroke);
      } else {
        strokesChanged = true;
        segments.forEach((pts, idx) => {
          if (pts.length > 0) {
            newStrokes.push({
              ...stroke,
              id: uuidv4(),
              name: stroke.name ? `${stroke.name} Part ${idx + 1}` : undefined,
              points: pts,
            });
          }
        });
      }
    }

    if (strokesChanged) {
      state.updatePlane(planeId, { strokes: newStrokes });
      this.project = useStore.getState().project; // update local ref
      
      const planeData = this.planeMap.get(planeId);
      if (planeData) {
        this.redrawPlane(this.project.planes.find(p => p.id === planeId)!, planeData.context);
      }
    }
  }

  private distToSegmentSquared(p: {x: number, y: number}, v: {x: number, y: number}, w: {x: number, y: number}) {
    let l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return (p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2;
  }

  private onPointerMove(e: any) {
    const pointerId = e.pointerId ?? 0;
    if (this.activePointerId !== null && this.activePointerId !== pointerId) return;

    const state = useStore.getState();
    const pos = e.global;
    
    // Store pointer position for auto-pan
    this.pointerGlobal = { x: pos.x, y: pos.y };
    
    if (this.isDragging) {
      const dx = pos.x - this.dragStart!.x;
      const dy = pos.y - this.dragStart!.y;
      
      if (state.mode === 'play') {
        this.cameraX = this.cameraStart!.x - dx;
        // Do not move cameraY in play mode by default, or only slightly.
        this.velocityX = this.lastDragX - pos.x;
        this.lastDragX = pos.x;
      } else {
        // Panning in draw mode
        this.cameraX = this.cameraStart!.x - dx / this.zoom;
        this.cameraY = this.cameraStart!.y - dy / this.zoom;
      }
      return;
    }

    if (this.isDraggingStroke && state.selectedStrokeId && state.selectedPlaneId) {
      const plane = this.project.planes.find(p => p.id === state.selectedPlaneId);
      if (plane) {
        const localPos = this.getGlobalToPlane(pos.x, pos.y, plane);
        const dx = localPos.x - this.dragStrokeStartPos.x;
        const dy = localPos.y - this.dragStrokeStartPos.y;
        
        const translatedPoints = this.dragStrokeStartPoints.map(pt => ({
          x: pt.x + dx,
          y: pt.y + dy
        }));
        
        state.updateStroke(plane.id, state.selectedStrokeId, { points: translatedPoints });
      }
      return;
    }
    
    if (this.isDrawing) {
      const planeId = state.selectedPlaneId;
      const plane = this.project.planes.find(p => p.id === planeId);
      if (!plane) return;

      const localPos = this.getGlobalToPlane(pos.x, pos.y, plane);

      if (state.tool === 'eraser') {
        if (state.eraserMode === 'classic') {
          this.eraseAtClassic(localPos.x, localPos.y, plane.id, state.brushSize);
        } else {
          this.eraseAt(localPos.x, localPos.y, plane.id, state.brushSize);
        }
        this.lastPos = localPos;
      } else if (this.currentStroke) {
        const planeData = this.planeMap.get(plane.id);
        if (!planeData) return;
        
        const snapEnabled = state.project.gridSnapEnabled && state.project.gridEnabled;
        const isStraightSnap = snapEnabled && (state.project.gridSnapMode !== 'freehand');

        if (isStraightSnap) {
          // Connected straight snap line - prevents creating multiple micro segments
          const startPt = this.currentStroke.points[0];
          this.currentStroke.points = [startPt, { x: localPos.x, y: localPos.y }];
          this.redrawPlane(plane, planeData.context);
          this.lastPos = localPos;
        } else {
          // EMA Smoothing
          const smoothing = this.currentStroke.smoothing ?? 0;
          const alpha = 1.0 - (smoothing / 25.0); // 0 -> alpha=1.0 (no smoothing), 20 -> alpha=0.2 (strong smoothing)
          
          const newX = this.lastPos!.x + (localPos.x - this.lastPos!.x) * alpha;
          const newY = this.lastPos!.y + (localPos.y - this.lastPos!.y) * alpha;
          
          // Only add if moved enough
          const dist = Math.hypot(newX - this.lastPos!.x, newY - this.lastPos!.y);
          if (dist > 1.5) {
            this.currentStroke.points.push({ x: newX, y: newY });
            this.redrawPlane(plane, planeData.context);
            this.lastPos = { x: newX, y: newY };
          }
        }
      }
    }
  }

  private onPointerUp(e: any) {
    const pointerId = e.pointerId ?? 0;
    if (this.activePointerId !== null && this.activePointerId !== pointerId) return;
    this.activePointerId = null;

    if (this.isDragging) {
      this.isDragging = false;
      return;
    }

    if (this.isDraggingStroke) {
      this.isDraggingStroke = false;
      return;
    }
    
    if (this.isDrawing) {
      this.isDrawing = false;
      const state = useStore.getState();
      
      if (state.tool === 'eraser') {
        // Eraser action is already committed
      } else if (this.currentStroke && state.selectedPlaneId) {
        const strokeToAdd = this.currentStroke;
        this.currentStroke = null;
        
        // Save to store (now commits automatically)
        state.addStroke(state.selectedPlaneId, strokeToAdd);
        
        // Redraw plane to commit render
        const plane = this.project.planes.find(p => p.id === state.selectedPlaneId);
        const planeData = this.planeMap.get(state.selectedPlaneId);
        if (plane && planeData) {
          this.redrawPlane(plane, planeData.context);
        }
      }
    }
  }

  private getGlobalToPlane(globalX: number, globalY: number, plane: Plane) {
    const cx = this.app.screen.width / 2;
    const cy = this.app.screen.height / 2;
    
    // 1. Convert global to rootContainer space
    const rootX = (globalX - cx) / this.zoom;
    const rootY = (globalY - cy) / this.zoom;
    
    // 2. Find the exact container position as calculated in update()
    const planeData = this.planeMap.get(plane.id);
    if (!planeData) return { x: 0, y: 0 };
    
    const containerX = planeData.container.x;
    const containerY = planeData.container.y;
    
    // 3. Subtract container position to get plane-local coordinates
    let planeX = rootX - containerX;
    let planeY = rootY - containerY;
    
    // 4. Apply grid snapping if enabled
    const state = useStore.getState();
    if (state.project.gridEnabled && state.project.gridSnapEnabled && state.project.gridSize > 0) {
      planeX = Math.round(planeX / state.project.gridSize) * state.project.gridSize;
      planeY = Math.round(planeY / state.project.gridSize) * state.project.gridSize;
    }
    
    return { x: planeX, y: planeY };
  }

  private update(ticker: Ticker) {
    if (this.isDestroyed) return;
    const state = useStore.getState();
    const cx = this.app.screen.width / 2;
    const cy = this.app.screen.height / 2;
    
    // Keyboard panning
    const panSpeed = 10 / this.zoom;
    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      this.cameraX -= panSpeed;
    }
    if (this.keys.has('d') || this.keys.has('arrowright')) {
      this.cameraX += panSpeed;
    }

    if (state.mode === 'play' && !this.isDragging) {
      // Apply inertia
      this.cameraX += this.velocityX;
      this.velocityX *= 0.95; // Friction
      if (Math.abs(this.velocityX) < 0.1) this.velocityX = 0;
      
      // Auto-pan
      if (state.autoPanEnabled && this.pointerGlobal) {
        const margin = 150; // Distance from edge to start panning
        const maxSpeed = 15;
        const screenW = this.app.screen.width;
        
        if (this.pointerGlobal.x < margin) {
          const intensity = 1 - (this.pointerGlobal.x / margin);
          this.autoPanSpeedX = -maxSpeed * intensity;
        } else if (this.pointerGlobal.x > screenW - margin) {
          const intensity = (this.pointerGlobal.x - (screenW - margin)) / margin;
          this.autoPanSpeedX = maxSpeed * intensity;
        } else {
          this.autoPanSpeedX = 0;
        }
        this.cameraX += this.autoPanSpeedX / this.zoom;
      }
    }
    
    // Wrap cameraX to keep it bounded (optional, but prevents floating point precision loss)
    // this.cameraX = ((this.cameraX % this.project.width) + this.project.width) % this.project.width;
    
    this.rootContainer.x = cx;
    this.rootContainer.y = cy;
    this.rootContainer.scale.set(this.zoom);
    
    // Draw grid
    if (this.gridGraphics && this.gridGraphics.context) {
      try {
        this.gridGraphics.clear();
      } catch (e) {
        console.warn("Error clearing gridGraphics context:", e);
      }
    }
    const proj = state.project;
    if (proj.gridEnabled && proj.gridSize > 0) {
      const size = proj.gridSize;
      const colorHex = proj.gridColor || '#cccccc';
      const color = parseInt(colorHex.replace('#', '0x')) || 0xcccccc;
      const opacity = proj.gridOpacity ?? 0.5;
      const roundness = proj.gridRoundness ?? 0;
      
      const screenW = this.app.screen.width / this.zoom;
      const screenH = this.app.screen.height / this.zoom;
      const left = -screenW / 2;
      const right = screenW / 2;
      const top = -screenH / 2;
      const bottom = screenH / 2;
      
      const offsetX = (this.cameraX % size);
      const offsetY = (this.cameraY % size);
      
      const startX = left - (left % size) - offsetX;
      const startY = top - (top % size) - offsetY;
      
      if (roundness === 0) {
        // Line grid
        for (let x = startX; x <= right; x += size) {
          this.gridGraphics.moveTo(x, top).lineTo(x, bottom);
        }
        for (let y = startY; y <= bottom; y += size) {
          this.gridGraphics.moveTo(left, y).lineTo(right, y);
        }
        this.gridGraphics.stroke({ color, width: 1 / this.zoom, alpha: opacity });
      } else {
        // Dot grid / Rounded intersections
        const radius = Math.max(1, (size * 0.08) * (roundness / 100));
        for (let x = startX; x <= right; x += size) {
          for (let y = startY; y <= bottom; y += size) {
            this.gridGraphics.circle(x, y, radius);
          }
        }
        this.gridGraphics.fill({ color, alpha: opacity });
      }
    }
    
    for (const plane of this.project.planes) {
      const planeData = this.planeMap.get(plane.id);
      if (!planeData) continue;
      
      const parallaxOffsetX = this.cameraX * plane.parallaxX;
      const parallaxOffsetY = this.cameraY * plane.parallaxY;
      
      // We want the plane to loop based on camera.
      // If camera moves right, plane moves left relative to camera.
      // Modulo arithmetic for infinite wrap
      
      let xPos = -parallaxOffsetX;
      xPos = ((xPos % this.project.width) + this.project.width) % this.project.width;
      
      // Keep it centered between -width/2 and width/2
      if (xPos > this.project.width / 2) {
          xPos -= this.project.width;
      }
      
      planeData.container.x = xPos;
      planeData.container.y = -parallaxOffsetY - this.cameraY;
    }
  }

  public destroy() {
    this.isDestroyed = true;
    window.removeEventListener('panoramix:reset-view', this.onResetView);
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }
    
    // PixiJS v8 bug workaround: _cancelResize may be missing when resizeTo was used
    if (this.app && typeof (this.app as any)._cancelResize !== 'function') {
      (this.app as any)._cancelResize = () => {};
    }
    
    try {
      if (this.app) {
        if (this.app.ticker) {
          this.app.ticker.stop();
        }
        // Only destroy if the renderer is defined (meaning init completed).
        // Otherwise, the Application.destroy method will crash.
        if (this.app.renderer) {
          this.app.destroy(true, { children: true });
        }
      }
    } catch (e) {
      console.warn("Error destroying PixiJS app (ignored):", e);
    }
  }
}
