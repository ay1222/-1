
import React, { useEffect, useRef, useState } from 'react';
import { SceneService } from './services/sceneService';
import { GestureService } from './services/gestureService';
import { ShapeType, GestureState, ParticleConfig } from './types';
import { THEME } from './constants';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneServiceRef = useRef<SceneService | null>(null);
  const gestureServiceRef = useRef<GestureService | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [gestureState, setGestureState] = useState<GestureState | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [manualOpenness, setManualOpenness] = useState(1.0);

  const [config, setConfig] = useState<ParticleConfig>({
    count: 8000,
    color: THEME.METALLIC_GOLD,
    size: 0.12,
    glowStrength: 1.4,
    shape: ShapeType.TREE
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new SceneService(containerRef.current);
    sceneServiceRef.current = scene;

    const handleMouseMove = (e: MouseEvent) => {
      if (isCameraActive) return; 
      const x = (e.clientX / window.innerWidth) - 0.5;
      const y = (e.clientY / window.innerHeight) - 0.5;
      
      setGestureState(prev => {
        const newState: GestureState = {
          openness: manualOpenness,
          rotation: { x: y * 0.5, y: x * 0.5, z: 0 },
          isPinching: prev?.isPinching || false,
          pinchStrength: prev?.pinchStrength || 0,
          center: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight }
        };
        scene.updateGestures(newState);
        return newState;
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        scene.toggleZenMode();
        return;
      }
      if (isCameraActive) return;
      const isRightClick = e.button === 2;
      setGestureState(prev => {
        const newState = {
          ...prev!,
          openness: isRightClick ? 1 : 0, 
          isPinching: isRightClick || e.shiftKey,
          pinchStrength: (isRightClick || e.shiftKey) ? 1 : 0
        };
        scene.updateGestures(newState);
        return newState;
      });
    };

    const handleMouseUp = () => {
      if (isCameraActive) return;
      setGestureState(prev => {
        const newState = { ...prev!, openness: manualOpenness, isPinching: false, pinchStrength: 0 };
        scene.updateGestures(newState);
        return newState;
      });
    };

    const handleWheel = (e: WheelEvent) => {
      if (isCameraActive) return;
      e.preventDefault();
      setManualOpenness(prev => {
        const next = Math.min(Math.max(prev - e.deltaY * 0.001, 0.1), 2.5);
        setGestureState(gs => {
           if (gs) {
             const updated = { ...gs, openness: next };
             scene.updateGestures(updated);
             return updated;
           }
           return gs;
        });
        return next;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [isCameraActive, manualOpenness]);

  const startCamera = async () => {
    if (!videoRef.current) return;
    try {
      gestureServiceRef.current = new GestureService();
      await gestureServiceRef.current.start(videoRef.current, (state) => {
        setGestureState(state);
        sceneServiceRef.current?.updateGestures(state);
      });
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera access failed:", err);
    }
  };

  const handleShapeChange = (shape: ShapeType) => {
    setConfig(prev => ({ ...prev, shape }));
    sceneServiceRef.current?.updateConfig({ shape });
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setConfig(prev => ({ ...prev, color }));
    sceneServiceRef.current?.updateConfig({ color });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getShapeIcon = (shape: ShapeType) => {
    switch(shape) {
      case ShapeType.HEART: return '❤️';
      case ShapeType.FLOWER: return '🌸';
      case ShapeType.STAR: return '⭐';
      case ShapeType.TREE: return '🎄';
      case ShapeType.BUDDHA: return '⚪';
      case ShapeType.FIREWORKS: return '🎆';
      default: return '●';
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050505] text-white selection:bg-yellow-500/30 font-sans">
      <div ref={containerRef} className="absolute inset-0 z-0" />
      <video ref={videoRef} className="hidden" playsInline muted />
      <div className="absolute inset-0 pointer-events-none z-[1] shadow-[inset_0_0_200px_rgba(0,0,0,0.8)]" />

      {/* Hand Recognition Feedback Overlay */}
      {isCameraActive && (
        <div className="absolute top-24 right-8 w-32 h-24 bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 z-50">
          <video autoPlay muted playsInline ref={(v) => { if(v) v.srcObject = videoRef.current?.srcObject as MediaStream; }} className="w-full h-full object-cover scale-x-[-1]" />
        </div>
      )}

      {/* Main UI Layer */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
        
        {/* TOP TOOLBAR: Morphing Controls */}
        <header className="flex flex-col items-center gap-4 pointer-events-auto">
          <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-white/5 backdrop-blur-3xl rounded-full border border-white/10 shadow-2xl">
            {Object.values(ShapeType).map((shape) => (
              <button 
                key={shape} 
                onClick={() => handleShapeChange(shape)}
                className={`w-12 h-12 rounded-full text-xl flex items-center justify-center transition-all ${config.shape === shape ? 'bg-yellow-500 shadow-lg shadow-yellow-500/40 scale-110' : 'hover:bg-white/10'}`}
              >
                {getShapeIcon(shape)}
              </button>
            ))}
          </div>
          
          <div className="flex gap-3">
             {!isCameraActive && (
                <button onClick={startCamera} className="px-5 py-2 bg-yellow-500 text-black font-black text-[9px] uppercase rounded-full shadow-xl hover:scale-105 transition-all">
                  📷
                </button>
             )}
            <button onClick={toggleFullscreen} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 backdrop-blur-xl rounded-full transition-all border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </header>

        <div className="flex-1" />

        {/* BOTTOM TOOLBAR: Tint & Status */}
        <footer className="flex justify-end pointer-events-auto">
          <div className="w-48 p-4 bg-white/5 backdrop-blur-3xl rounded-[1.2rem] border border-white/10 shadow-2xl space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[7px] uppercase tracking-tighter text-gray-500 font-black">🎨</label>
                <span className="text-[7px] text-yellow-500 font-mono">{config.color}</span>
              </div>
              <div className="relative h-4 w-full overflow-hidden rounded-sm">
                 <input type="color" value={config.color} onChange={handleColorChange} className="absolute -inset-1 w-[120%] h-[120%] bg-transparent cursor-pointer border-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-center">
                <span className="text-[9px] font-mono text-white">✨</span>
              </div>
              <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-center">
                <span className="text-[9px] font-mono text-white tracking-tighter">{isCameraActive ? '🖐️' : '🖱️'}</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
