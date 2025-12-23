
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PageConfig, PhotoImage, ImageOffset, Frame } from '../types';
import { Tooltip } from '../App';

interface PageProps {
  pageIndex: number;
  config: PageConfig;
  activeFrameId: string | null;
  onSetActiveFrameId: (id: string | null) => void;
  libraryImages: PhotoImage[];
  ratio: number;
  width?: number;
  isRightPage?: boolean;
  onDropImage: (pageIndex: number, frameId: string | null, imageId: string, x?: number, y?: number) => void;
  onUpdateFrame: (pageIndex: number, frameId: string, updates: Partial<Frame>) => void;
  onDeleteFrame: (pageIndex: number, frameId: string) => void;
  onDuplicateFrame: (pageIndex: number, frameId: string) => void;
  onAddFrame: (pageIndex: number, x?: number, y?: number) => void;
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const SNAP_THRESHOLD = 1.5; // Percentage
const FIXED_SNAP_POINTS = [0, 25, 50, 75, 100];

const ASPECT_PRESETS = [
  { label: 'Square (1:1)', ratio: 1 },
  { label: '4 x 6 (3:2)', ratio: 1.5 },
  { label: '6 x 4 (2:3)', ratio: 0.666 },
  { label: '5 x 7 (1.4)', ratio: 1.4 },
  { label: 'Cinematic (16:9)', ratio: 1.777 },
];

export const Page: React.FC<PageProps> = ({ 
  pageIndex, 
  config, 
  activeFrameId,
  onSetActiveFrameId,
  libraryImages,
  ratio, 
  width = 450, 
  isRightPage, 
  onDropImage,
  onUpdateFrame,
  onDeleteFrame,
  onDuplicateFrame,
  onAddFrame
}) => {
  const [draggingFrame, setDraggingFrame] = useState<string | null>(null);
  const [resizingFrame, setResizingFrame] = useState<{ id: string; handle: ResizeHandle } | null>(null);
  const [panningFrame, setPanningFrame] = useState<string | null>(null);
  const [snapLines, setSnapLines] = useState<{ x?: number[]; y?: number[] }>({});
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, frameId: string } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number, y: number, initialX: number, initialY: number, initialW: number, initialH: number, initialRatio: number } | null>(null);
  const panStartRef = useRef<{ x: number, y: number, initialOffsetX: number, initialOffsetY: number } | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleBackgroundDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const imageId = e.dataTransfer.getData('imageId');
    if (imageId) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      onDropImage(pageIndex, null, imageId, x, y);
    }
  };

  const handleFrameDrop = (e: React.DragEvent, frameId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const imageId = e.dataTransfer.getData('imageId');
    if (imageId) {
      onDropImage(pageIndex, frameId, imageId);
    }
  };

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('page-bg-overlay')) {
      onSetActiveFrameId(null);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('page-bg-overlay')) {
        const rect = containerRef.current!.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        onAddFrame(pageIndex, x, y);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, frameId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onSetActiveFrameId(frameId);
    setContextMenu({ x: e.clientX, y: e.clientY, frameId });
  };

  const applyAspectRatio = useCallback((frameId: string, targetVisualRatio: number) => {
    const frame = config.frames.find(f => f.id === frameId);
    if (!frame) return;

    // To keep the visual ratio V = W_px / H_px:
    // W_px = pageWidth * (W_% / 100)
    // H_px = pageHeight * (H_% / 100)
    // V = (pageWidth * W_%) / (pageHeight * H_%)
    // V = ratio * (W_% / H_%)
    // H_% = (W_% * ratio) / V
    
    let newWidth = frame.width;
    let newHeight = (newWidth * ratio) / targetVisualRatio;

    // If newHeight exceeds the page boundaries, scale down the width instead
    if (frame.y + newHeight > 100) {
      newHeight = 100 - frame.y;
      newWidth = (newHeight * targetVisualRatio) / ratio;
    }

    // Double check width
    if (frame.x + newWidth > 100) {
      newWidth = 100 - frame.x;
      newHeight = (newWidth * ratio) / targetVisualRatio;
    }

    onUpdateFrame(pageIndex, frameId, { 
      width: newWidth, 
      height: newHeight,
      isLocked: true 
    });
    setContextMenu(null);
  }, [config.frames, ratio, pageIndex, onUpdateFrame]);

  const handleCustomRatio = (frameId: string) => {
    const input = window.prompt("Set target visual aspect ratio (e.g. 1.0 for square, 1.5 for 4:6, or 16:9):", "1.5");
    if (!input) return;

    let ratioVal: number;
    if (input.includes(':')) {
      const parts = input.split(':');
      ratioVal = parseFloat(parts[0]) / parseFloat(parts[1]);
    } else {
      ratioVal = parseFloat(input);
    }

    if (!isNaN(ratioVal) && ratioVal > 0) {
      applyAspectRatio(frameId, ratioVal);
    } else {
      alert("Invalid aspect ratio. Use numbers or common ratios like 16:9.");
    }
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const startDragging = (e: React.MouseEvent, frame: Frame) => {
    if (panningFrame || resizingFrame) return;
    if (e.button === 2) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggingFrame(frame.id);
    onSetActiveFrameId(frame.id);
    dragStartRef.current = { 
      x: e.clientX, 
      y: e.clientY, 
      initialX: frame.x, 
      initialY: frame.y,
      initialW: frame.width,
      initialH: frame.height,
      initialRatio: frame.width / frame.height // Store the current percentage-based ratio
    };
  };

  const startResizing = (e: React.MouseEvent, frame: Frame, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingFrame({ id: frame.id, handle });
    onSetActiveFrameId(frame.id);
    dragStartRef.current = { 
      x: e.clientX, 
      y: e.clientY, 
      initialX: frame.x, 
      initialY: frame.y,
      initialW: frame.width,
      initialH: frame.height,
      initialRatio: frame.width / frame.height
    };
  };

  const startPanning = (e: React.MouseEvent, frame: Frame) => {
    if (frame.cropType !== 'fill') return;
    e.preventDefault();
    e.stopPropagation();
    setPanningFrame(frame.id);
    onSetActiveFrameId(frame.id);
    panStartRef.current = { 
      x: e.clientX, 
      y: e.clientY, 
      initialOffsetX: frame.offset.x, 
      initialOffsetY: frame.offset.y 
    };
  };

  const getSnapTargetPoints = (activeId: string) => {
    const xPoints = new Set(FIXED_SNAP_POINTS);
    const yPoints = new Set(FIXED_SNAP_POINTS);

    config.frames.forEach(f => {
      if (f.id === activeId) return;
      xPoints.add(f.x);
      xPoints.add(f.x + f.width);
      xPoints.add(f.x + f.width / 2);
      yPoints.add(f.y);
      yPoints.add(f.y + f.height);
      yPoints.add(f.y + f.height / 2);
    });

    return { x: Array.from(xPoints), y: Array.from(yPoints) };
  };

  const findBestSnap = (val: number, targets: number[]) => {
    for (const target of targets) {
      if (Math.abs(val - target) < SNAP_THRESHOLD) return { snapped: target, isSnapped: true };
    }
    return { snapped: val, isSnapped: false };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !dragStartRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
      const dy = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;

      const activeId = draggingFrame || resizingFrame?.id;
      if (!activeId) return;
      const targets = getSnapTargetPoints(activeId);

      if (draggingFrame) {
        let newX = dragStartRef.current.initialX + dx;
        let newY = dragStartRef.current.initialY + dy;
        const w = dragStartRef.current.initialW;
        const h = dragStartRef.current.initialH;

        const snapX = findBestSnap(newX, targets.x);
        const snapRight = findBestSnap(newX + w, targets.x);
        const snapCenterX = findBestSnap(newX + w / 2, targets.x);

        const snapY = findBestSnap(newY, targets.y);
        const snapBottom = findBestSnap(newY + h, targets.y);
        const snapCenterY = findBestSnap(newY + h / 2, targets.y);

        const activeSnapX: number[] = [];
        const activeSnapY: number[] = [];

        if (snapX.isSnapped) { newX = snapX.snapped; activeSnapX.push(snapX.snapped); }
        else if (snapRight.isSnapped) { newX = snapRight.snapped - w; activeSnapX.push(snapRight.snapped); }
        else if (snapCenterX.isSnapped) { newX = snapCenterX.snapped - w / 2; activeSnapX.push(snapCenterX.snapped); }

        if (snapY.isSnapped) { newY = snapY.snapped; activeSnapY.push(snapY.snapped); }
        else if (snapBottom.isSnapped) { newY = snapBottom.snapped - h; activeSnapY.push(snapBottom.snapped); }
        else if (snapCenterY.isSnapped) { newY = snapCenterY.snapped - h / 2; activeSnapY.push(snapCenterY.snapped); }

        newX = Math.max(0, Math.min(100 - w, newX));
        newY = Math.max(0, Math.min(100 - h, newY));

        setSnapLines({ x: activeSnapX.length ? activeSnapX : undefined, y: activeSnapY.length ? activeSnapY : undefined });
        onUpdateFrame(pageIndex, draggingFrame, { x: newX, y: newY });
      }

      if (resizingFrame) {
        const frame = config.frames.find(f => f.id === resizingFrame.id);
        if (!frame) return;

        let { initialX: x, initialY: y, initialW: w, initialH: h, initialRatio: ar } = dragStartRef.current;
        const { handle } = resizingFrame;
        const activeSnapX: number[] = [];
        const activeSnapY: number[] = [];

        if (handle.includes('e')) w += dx;
        if (handle.includes('w')) { x += dx; w -= dx; }
        if (handle.includes('s')) h += dy;
        if (handle.includes('n')) { y += dy; h -= dy; }

        if (handle.includes('e')) {
            const snap = findBestSnap(x + w, targets.x);
            if (snap.isSnapped) { w = snap.snapped - x; activeSnapX.push(snap.snapped); }
        } else if (handle.includes('w')) {
            const snap = findBestSnap(x, targets.x);
            if (snap.isSnapped) { const oldRight = x + w; x = snap.snapped; w = oldRight - x; activeSnapX.push(snap.snapped); }
        }

        if (handle.includes('s')) {
            const snap = findBestSnap(y + h, targets.y);
            if (snap.isSnapped) { h = snap.snapped - y; activeSnapY.push(snap.snapped); }
        } else if (handle.includes('n')) {
            const snap = findBestSnap(y, targets.y);
            if (snap.isSnapped) { const oldBottom = y + h; y = snap.snapped; h = oldBottom - y; activeSnapY.push(snap.snapped); }
        }

        if (frame.isLocked) {
           const useWidthAsMaster = handle === 'e' || handle === 'w' || (handle.includes('e') && Math.abs(dx) > Math.abs(dy)) || (handle.includes('w') && Math.abs(dx) > Math.abs(dy));
           
           if (useWidthAsMaster) {
              const newH = w / ar;
              if (handle.includes('n')) {
                 y = (y + h) - newH;
              }
              h = newH;
           } else {
              const newW = h * ar;
              if (handle.includes('w')) {
                 x = (x + w) - newW;
              }
              w = newW;
           }
        }

        if (w < 5) w = 5;
        if (h < 5) h = 5;
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x + w > 100) w = 100 - x;
        if (y + h > 100) h = 100 - y;

        setSnapLines({ x: activeSnapX.length ? activeSnapX : undefined, y: activeSnapY.length ? activeSnapY : undefined });
        onUpdateFrame(pageIndex, resizingFrame.id, { x, y, width: w, height: h });
      }

      if (panningFrame && panStartRef.current) {
        const pdx = e.clientX - panStartRef.current.x;
        const pdy = e.clientY - panStartRef.current.y;
        const sensitivity = 0.2;
        onUpdateFrame(pageIndex, panningFrame, {
          offset: {
            x: Math.max(0, Math.min(100, panStartRef.current.initialOffsetX - (pdx * sensitivity))),
            y: Math.max(0, Math.min(100, panStartRef.current.initialOffsetY - (pdy * sensitivity)))
          }
        });
      }
    };

    const handleMouseUp = () => {
      setDraggingFrame(null);
      setResizingFrame(null);
      setPanningFrame(null);
      setSnapLines({});
      dragStartRef.current = null;
      panStartRef.current = null;
    };

    if (draggingFrame || panningFrame || resizingFrame) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingFrame, panningFrame, resizingFrame, pageIndex, onUpdateFrame, config.frames, ratio]);

  const safeRatio = ratio || 1;
  const height = width / safeRatio;
  const paddingValue = (config.margin / 16) * width;

  return (
    <div 
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleBackgroundDrop}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleBackgroundMouseDown}
      className={`bg-white relative overflow-hidden flex flex-col ${isRightPage ? 'border-l border-slate-300' : ''}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* Custom Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-[100] bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl py-1 min-w-[180px] overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-[#333] mb-1">Frame Layer</div>
          
          <button 
            className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors flex items-center gap-2"
            onClick={() => {
              onDuplicateFrame(pageIndex, contextMenu.frameId);
              setContextMenu(null);
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
            Duplicate Frame
          </button>

          <button 
            className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-600 transition-colors"
            onClick={() => {
              const frame = config.frames.find(f => f.id === contextMenu.frameId);
              if (frame) onUpdateFrame(pageIndex, frame.id, { isLocked: !frame.isLocked });
              setContextMenu(null);
            }}
          >
            {config.frames.find(f => f.id === contextMenu.frameId)?.isLocked ? 'Unlock Aspect Ratio' : 'Lock Aspect Ratio'}
          </button>

          <div className="px-3 py-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest border-y border-[#333] my-1">Set Visual Aspect Ratio</div>
          
          {ASPECT_PRESETS.map((p) => (
            <button 
              key={p.label}
              className="w-full text-left px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors flex justify-between items-center"
              onClick={() => applyAspectRatio(contextMenu.frameId, p.ratio)}
            >
              {p.label}
              <span className="text-[8px] text-slate-500 font-normal">{p.ratio.toFixed(2)}</span>
            </button>
          ))}

          <button 
            className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 border-t border-[#333] transition-colors"
            onClick={() => handleCustomRatio(contextMenu.frameId)}
          >
            Custom Ratio...
          </button>

          <div className="h-px bg-[#333] my-1" />
          
          <button 
            className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:bg-red-600 hover:text-white transition-colors"
            onClick={() => {
              onDeleteFrame(pageIndex, contextMenu.frameId);
              setContextMenu(null);
            }}
          >
            Delete Frame
          </button>
        </div>
      )}

      {/* Snap Guides */}
      {snapLines.x?.map(x => (
        <div key={`x-${x}`} className="absolute top-0 bottom-0 w-px bg-blue-500/50 z-[60] pointer-events-none" style={{ left: `${x}%` }} />
      ))}
      {snapLines.y?.map(y => (
        <div key={`y-${y}`} className="absolute left-0 right-0 h-px bg-blue-500/50 z-[60] pointer-events-none" style={{ top: `${y}%` }} />
      ))}

      {/* Empty State Call to Action */}
      {config.frames.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 pointer-events-none">
           <div className="w-full h-full border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-300">
             <div className="w-12 h-12 mb-3 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Double click to add frame</p>
             <p className="text-[8px] font-bold uppercase tracking-widest text-slate-300 mt-1">Or drag an image here</p>
           </div>
        </div>
      )}

      <div className="absolute inset-0 page-bg-overlay" style={{ padding: `${paddingValue}px` }}>
        <div className="relative w-full h-full">
          {config.frames.map((frame) => {
            const image = libraryImages.find(img => img.id === frame.imageId);
            const isActive = activeFrameId === frame.id;
            
            return (
              <div
                key={frame.id}
                onMouseDown={(e) => startDragging(e, frame)}
                onContextMenu={(e) => handleContextMenu(e, frame.id)}
                onDrop={(e) => handleFrameDrop(e, frame.id)}
                className={`absolute group cursor-move border transition-shadow duration-200 ${isActive ? 'z-50 border-blue-500 ring-4 ring-blue-500/10' : 'z-10 border-transparent hover:border-slate-300'} bg-slate-50 overflow-visible rounded-sm shadow-sm hover:shadow-md`}
                style={{
                  left: `${frame.x}%`,
                  top: `${frame.y}%`,
                  width: `${frame.width}%`,
                  height: `${frame.height}%`,
                  zIndex: frame.zIndex
                }}
              >
                <div className="w-full h-full relative overflow-hidden">
                  {image ? (
                    <div className="w-full h-full relative">
                      <img 
                        src={image.url}
                        className={`w-full h-full pointer-events-none select-none ${frame.cropType === 'fill' ? 'object-cover' : 'object-contain'}`}
                        style={{
                          transform: `scale(${frame.scale})`,
                          objectPosition: frame.cropType === 'fill' ? `${frame.offset.x}% ${frame.offset.y}%` : 'center'
                        }}
                      />
                      
                      {/* Controls Overlay */}
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <div className="flex justify-between items-start">
                          {frame.cropType === 'fill' && (
                            <Tooltip text="Hold & Drag to pan photo inside frame">
                              <button 
                                onMouseDown={(e) => { e.stopPropagation(); startPanning(e, frame); }}
                                className="w-7 h-7 bg-white/90 backdrop-blur shadow-lg rounded-full flex items-center justify-center text-slate-800 hover:bg-blue-600 hover:text-white transition-colors"
                                title="Pan Crop"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-3.04l.53-.81a10.723 10.723 0 012.544-2.812M12 11V9a2 2 0 00-2-2H8a2 2 0 00-2-2v2a2 2 0 002 2h2a2 2 0 002-2zM12 11h2a2 2 0 012 2v2a2 2 0 01-2 2h-2m-3.44-3.04a10.723 10.723 0 00-2.544-2.812"/></svg>
                              </button>
                            </Tooltip>
                          )}
                          <div className="flex gap-1">
                            <Tooltip text={`Switch to ${frame.cropType === 'fill' ? 'Fit' : 'Fill'} mode`}>
                              <button 
                                onClick={(e) => { e.stopPropagation(); onUpdateFrame(pageIndex, frame.id, { cropType: frame.cropType === 'fill' ? 'fit' : 'fill' }) }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="px-2 py-0.5 bg-white/90 backdrop-blur shadow-lg rounded text-[8px] font-black uppercase text-slate-800 hover:bg-blue-600 hover:text-white"
                              >
                                {frame.cropType}
                              </button>
                            </Tooltip>
                            {frame.isLocked && (
                               <Tooltip text="Aspect ratio is locked (Right-click to change)">
                                 <div className="w-4 h-4 bg-white/90 backdrop-blur shadow-lg rounded flex items-center justify-center text-slate-800">
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                 </div>
                               </Tooltip>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 bg-white/90 backdrop-blur p-2 rounded shadow-lg" onMouseDown={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-1.5">
                            <Tooltip text="Zoom image content">
                              <div className="flex items-center gap-2">
                                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/></svg>
                                <input 
                                  type="range" min="1" max="3" step="0.05" 
                                  value={frame.scale}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onChange={(e) => onUpdateFrame(pageIndex, frame.id, { scale: parseFloat(e.target.value) })}
                                  className="flex-1 h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-blue-600"
                                />
                              </div>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 text-slate-300">
                      <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      <span className="text-[8px] font-black uppercase tracking-tighter">Drop Image</span>
                    </div>
                  )}
                </div>

                {isActive && (
                  <>
                    <div onMouseDown={(e) => { e.stopPropagation(); startResizing(e, frame, 'nw'); }} className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-white border-2 border-blue-600 cursor-nw-resize z-50 rounded-sm shadow-sm" />
                    <div onMouseDown={(e) => { e.stopPropagation(); startResizing(e, frame, 'n'); }}  className="absolute left-1/2 -top-1.5 w-3 h-3 -ml-1.5 bg-white border-2 border-blue-600 cursor-n-resize z-50 rounded-sm shadow-sm" />
                    <div onMouseDown={(e) => { e.stopPropagation(); startResizing(e, frame, 'ne'); }} className="absolute -right-1.5 -top-1.5 w-3 h-3 bg-white border-2 border-blue-600 cursor-ne-resize z-50 rounded-sm shadow-sm" />
                    <div onMouseDown={(e) => { e.stopPropagation(); startResizing(e, frame, 'e'); }}  className="absolute -right-1.5 top-1/2 w-3 h-3 -mt-1.5 bg-white border-2 border-blue-600 cursor-e-resize z-50 rounded-sm shadow-sm" />
                    <div onMouseDown={(e) => { e.stopPropagation(); startResizing(e, frame, 'se'); }} className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-white border-2 border-blue-600 cursor-se-resize z-50 rounded-sm shadow-sm" />
                    <div onMouseDown={(e) => { e.stopPropagation(); startResizing(e, frame, 's'); }}  className="absolute left-1/2 -bottom-1.5 w-3 h-3 -ml-1.5 bg-white border-2 border-blue-600 cursor-s-resize z-50 rounded-sm shadow-sm" />
                    <div onMouseDown={(e) => { e.stopPropagation(); startResizing(e, frame, 'sw'); }} className="absolute -left-1.5 -bottom-1.5 w-3 h-3 bg-white border-2 border-blue-600 cursor-sw-resize z-50 rounded-sm shadow-sm" />
                    <div onMouseDown={(e) => { e.stopPropagation(); startResizing(e, frame, 'w'); }}  className="absolute -left-1.5 top-1/2 w-3 h-3 -mt-1.5 bg-white border-2 border-blue-600 cursor-w-resize z-50 rounded-sm shadow-sm" />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {!isRightPage && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/[0.03] to-transparent z-10 pointer-events-none" />
      )}
      {isRightPage && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/[0.03] to-transparent z-10 pointer-events-none" />
      )}
    </div>
  );
};
