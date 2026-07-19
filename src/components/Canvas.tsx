import React, { useEffect, useRef } from 'react';
import { Engine } from '../pixi/PixiApp';

export const Canvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let isCancelled = false;
    let engine: Engine | null = null;
    let canvas: HTMLCanvasElement | null = null;

    const initEngine = async () => {
      canvas = document.createElement('canvas');
      canvas.className = "w-full h-full block touch-none";
      // We append it immediately so resizeTo has a parentElement
      containerRef.current?.appendChild(canvas);

      engine = new Engine(canvas);
      await engine.init();
      
      if (isCancelled) {
        engine.destroy();
        canvas.remove();
      } else {
        engineRef.current = engine;
      }
    };

    initEngine();

    return () => {
      isCancelled = true;
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      } else if (engine) {
        engine.destroy();
      }
      if (canvas) {
        canvas.remove();
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden touch-none" 
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};

