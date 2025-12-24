
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PageConfig, PhotoImage, Frame } from '../types';
import { Tooltip } from './Tooltip';

const ASPECT_PRESETS = [
  { label: 'Square (1:1)', ratio: 1 },
  { label: 'Standard (4:3)', ratio: 4/3 },
  { label: 'Standard (3:4)', ratio: 3/4 },
  { label: 'Classic (3:2)', ratio: 3/2 },
  { label: 'Classic (2:3)', ratio: 2/3 },
  { label: 'Wide (16:9)', ratio: 16/9 },
  { label: 'Portrait (9:16)', ratio: 9/16 },
];

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
  onClearPage: (pageIndex: number) => void;
  onInteractionStart?: () => void;
  onToggleSpread: (pageIndex: number, frameId: string) => void;
  neighborFrames?: Frame[];
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
type SnapType = 'center' | 'edge' | 'spine';

const SNAP_THRESHOLD = 1.25; // Tighter threshold for precision
const FIXED_SNAP_POINTS = [0, 50, 100]; // Page edges and center

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
  onAddFrame,
  onClearPage,
  onInteractionStart,
  onToggleSpread,
  neighborFrames = []
}) => {
  const [draggingFrame, setDraggingFrame] = useState<string | null>(null);
  const [resizingFrame, setResizingFrame] = useState<{ id: string; handle: ResizeHandle } | null>(null);
  
  // Enhanced Snap State
  const [activeGuides, setActiveGuides] = useState<{ x: { pos: number, type: SnapType }[], y: { pos: number, type: SnapType }[] }>({ x: [], y: [] });
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, frameId: string } | null>(null);
  const [pageContextMenu, setPageContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [customRatioValues, setCustomRatioValues] = useState({ w: 4, h: 3 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number, y: number, initialX: number, initialY: number, initialW: number, initialH: number, initialRatio: number } | null>(null);
  
  // Cache snap targets on drag start to improve performance
  const cachedSnapTargets = useRef<{ x: number[], y: number[] }>({ x: [], y: [] });

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
    if (e.button !== 0) return;
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
    setPageContextMenu(null);
  };

  const handlePageContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (draggingFrame || resizingFrame) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
       setPageContextMenu({ x: e.clientX, y: e.clientY });
       setContextMenu(null);
    }
  };

  const applyAspectRatio = useCallback((frameId: string, targetVisualRatio: number) => {
    const frame = config.frames.find(f => f.id === frameId);
    if (!frame) return;

    let newWidth = frame.width;
    let newHeight = (newWidth * ratio) / targetVisualRatio;

    if (isRightPage) {
        if (frame.y + newHeight > 100) {
          newHeight = 100 - frame.y;
          newWidth = (newHeight * targetVisualRatio) / ratio;
        }
        if (frame.x + newWidth > 100) {
          newWidth = 100 - frame.x;
          newHeight = (newWidth * ratio) / targetVisualRatio;
        }
    } else {
        if (frame.y + newHeight > 100) {
          newHeight = 100 - frame.y;
          newWidth = (newHeight * targetVisualRatio) / ratio;
        }
    }

    onUpdateFrame(pageIndex, frameId, { 
      width: newWidth, 
      height: newHeight,
      isLocked: true 
    });
    setContextMenu(null);
  }, [config.frames, ratio, pageIndex, onUpdateFrame, isRightPage]);

  useEffect(() => {
    const closeMenu = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.context-menu-prevent-close')) return;
        setContextMenu(null);
        setPageContextMenu(null);
    };
    window.addEventListener('mousedown', closeMenu);
    return () => window.removeEventListener('mousedown', closeMenu);
  }, []);

  // --- Snapping Logic ---

  const calculateSnapTargets = (activeId: string) => {
    const xPoints = new Set(FIXED_SNAP_POINTS);
    const yPoints = new Set(FIXED_SNAP_POINTS);

    // Current page frames
    config.frames.forEach(f => {
      if (f.id === activeId) return;
      xPoints.add(f.x);
      xPoints.add(f.x + f.width);
      xPoints.add(f.x + f.width / 2);
      yPoints.add(f.y);
      yPoints.add(f.y + f.height);
      yPoints.add(f.y + f.height / 2);
    });

    // Neighbor frames (offset logic for spreads)
    // Left Page items see Right page items at +100 offset
    // Right Page items see Left page items at -100 offset
    const offset = isRightPage ? -100 : 100;
    neighborFrames.forEach(f => {
       xPoints.add(f.x + offset);
       xPoints.add(f.x + f.width + offset);
       // Add neighbor center too
       xPoints.add(f.x + f.width / 2 + offset);
    });

    return { x: Array.from(xPoints), y: Array.from(yPoints) };
  };

  const getSnappedPosition = (current: number, width: number, targets: number[]) => {
    // Check Left, Center, Right edges
    const edges = [
      { val: current, offset: 0 },         // Left Edge
      { val: current + width / 2, offset: width / 2 }, // Center
      { val: current + width, offset: width } // Right Edge
    ];

    let bestSnap = current;
    let minDelta = SNAP_THRESHOLD;
    let snapType: SnapType | null = null;
    let guidePos: number | null = null;

    edges.forEach(edge => {
      for (const target of targets) {
        const delta = Math.abs(edge.val - target);
        if (delta < minDelta) {
          minDelta = delta;
          bestSnap = target - edge.offset;
          guidePos = target;
          
          // Determine snap type for visuals
          if (target === 100 && !isRightPage) snapType = 'spine';
          else if (target === 0 && isRightPage) snapType = 'spine';
          else if (target === 50 || edge.offset === width / 2) snapType = 'center';
          else snapType = 'edge';
        }
      }
    });

    return { 
      snapped: bestSnap, 
      guide: guidePos !== null && snapType ? { pos: guidePos, type: snapType } : null 
    };
  };

  const startDragging = (e: React.MouseEvent, frame: Frame) => {
    if (resizingFrame || e.button === 2) return;
    e.preventDefault();
    e.stopPropagation();
    if (onInteractionStart) onInteractionStart();
    
    // Pre-calculate snap targets
    cachedSnapTargets.current = calculateSnapTargets(frame.id);
    
    setDraggingFrame(frame.id);
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

  const startResizing = (e: React.MouseEvent, frame: Frame, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    if (onInteractionStart) onInteractionStart();

    cachedSnapTargets.current = calculateSnapTargets(frame.id);

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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !dragStartRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
      const dy = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;

      // --- DRAGGING LOGIC ---
      if (draggingFrame) {
        const { initialX, initialY, initialW, initialH } = dragStartRef.current;
        let rawX = initialX + dx;
        let rawY = initialY + dy;

        // Apply Snapping
        const snapX = getSnappedPosition(rawX, initialW, cachedSnapTargets.current.x);
        const snapY = getSnappedPosition(rawY, initialH, cachedSnapTargets.current.y);

        let finalX = snapX.snapped;
        let finalY = snapY.snapped;

        // Visual Boundary Clamping (Soft Limits)
        // Allow spread on Left Page (dragging right > 100%)
        // Right Page is stricter (0-100)
        if (isRightPage) {
           finalX = Math.max(0, Math.min(100 - initialW, finalX));
        } else {
           // Left page can go negative slightly (bleed) or positive (spread)
           finalX = Math.max(-5, Math.min(205 - initialW, finalX));
        }
        finalY = Math.max(0, Math.min(100 - initialH, finalY));

        setActiveGuides({ 
            x: snapX.guide ? [snapX.guide] : [], 
            y: snapY.guide ? [snapY.guide] : [] 
        });
        
        onUpdateFrame(pageIndex, draggingFrame, { x: finalX, y: finalY });
      }

      // --- RESIZING LOGIC ---
      if (resizingFrame) {
        const { initialX, initialY, initialW, initialH, initialRatio } = dragStartRef.current;
        const { handle } = resizingFrame;
        const frame = config.frames.find(f => f.id === resizingFrame.id);
        if (!frame) return;

        let newX = initialX;
        let newY = initialY;
        let newW = initialW;
        let newH = initialH;

        // 1. Calculate Raw Dimensions based on handle
        if (handle.includes('e')) newW = initialW + dx;
        if (handle.includes('w')) { newX = initialX + dx; newW = initialW - dx; }
        if (handle.includes('s')) newH = initialH + dy;
        if (handle.includes('n')) { newY = initialY + dy; newH = initialH - dy; }

        // 2. Snap the active edges
        const guidesX: { pos: number, type: SnapType }[] = [];
        const guidesY: { pos: number, type: SnapType }[] = [];

        // X-Axis Snapping
        if (handle.includes('e') || handle.includes('w')) {
            // What edge are we moving?
            const movingLeft = handle.includes('w');
            const targetEdge = movingLeft ? newX : (newX + newW);
            
            // Find closest snap for this specific edge
            let bestSnap = targetEdge;
            let minDelta = SNAP_THRESHOLD;
            let snapType: SnapType | null = null;
            
            cachedSnapTargets.current.x.forEach(target => {
                const d = Math.abs(target - targetEdge);
                if (d < minDelta) {
                    minDelta = d;
                    bestSnap = target;
                    snapType = (target === 50) ? 'center' : (target === 100 || target === 0) ? 'spine' : 'edge';
                }
            });

            if (snapType) {
                if (movingLeft) {
                    const diff = bestSnap - newX;
                    newX = bestSnap;
                    newW -= diff;
                } else {
                    newW = bestSnap - newX;
                }
                guidesX.push({ pos: bestSnap, type: snapType });
            }
        }

        // Y-Axis Snapping (Similar logic)
        if (handle.includes('n') || handle.includes('s')) {
            const movingTop = handle.includes('n');
            const targetEdge = movingTop ? newY : (newY + newH);
            let bestSnap = targetEdge;
            let minDelta = SNAP_THRESHOLD;
            let snapType: SnapType | null = null;

            cachedSnapTargets.current.y.forEach(target => {
                const d = Math.abs(target - targetEdge);
                if (d < minDelta) {
                    minDelta = d;
                    bestSnap = target;
                    snapType = (target === 50) ? 'center' : 'edge';
                }
            });

            if (snapType) {
                if (movingTop) {
                    const diff = bestSnap - newY;
                    newY = bestSnap;
                    newH -= diff;
                } else {
                    newH = bestSnap - newY;
                }
                guidesY.push({ pos: bestSnap, type: snapType });
            }
        }

        // 3. Aspect Ratio & Constraints
        if (frame.isLocked) {
             // If we snapped one dimension, force the other to match ratio
             // This is complex because snapping X might violate snapping Y or aspect ratio
             // For simplicity/robustness: Width dominates, adjust Height
             const useWidth = (handle.includes('e') || handle.includes('w'));
             if (useWidth) {
                 newH = newW / initialRatio;
                 if (handle.includes('n')) newY = (initialY + initialH) - newH;
             } else {
                 newW = newH * initialRatio;
                 if (handle.includes('w')) newX = (initialX + initialW) - newW;
             }
        }

        // 4. Min Size & Safe Bounds
        if (newW < 2) newW = 2;
        if (newH < 2) newH = 2;
        
        // Clamp visually
        const maxRight = isRightPage ? 100 : 205;
        if (newX < (isRightPage ? 0 : -5)) { 
            // Prevent dragging left past bleed
             if (!handle.includes('e')) { // if moving left handle
                 const diff = (isRightPage ? 0 : -5) - newX;
                 newX += diff; newW -= diff; 
             }
        }
        
        setActiveGuides({ x: guidesX, y: guidesY });
        onUpdateFrame(pageIndex, resizingFrame.id, { x: newX, y: newY, width: newW, height: newH });
      }
    };

    const handleMouseUp = () => {
      setDraggingFrame(null);
      setResizingFrame(null);
      setActiveGuides({ x: [], y: [] });
      dragStartRef.current = null;
    };

    if (draggingFrame || resizingFrame) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingFrame, resizingFrame, pageIndex, onUpdateFrame, config.frames, ratio, isRightPage]);

  const paddingValue = (config.margin / 16) * width;
  const allowOverflow = !isRightPage && config.frames.some(f => f.width > 100 || f.isSpread);

  return (
    <div 
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleBackgroundDrop}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleBackgroundMouseDown}
      onContextMenu={handlePageContextMenu}
      className={`bg-white relative flex flex-col ${allowOverflow ? 'overflow-visible z-20' : 'overflow-hidden z-10'} ${isRightPage ? 'border-l border-slate-300' : ''}`}
      style={{ width: `${width}px`, height: `${width / (ratio || 1)}px` }}
    >
      {/* Context Menu using Portal */}
      {contextMenu && createPortal(
        <div 
          className="fixed z-[9999] bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl py-1 min-w-[180px] overflow-hidden context-menu-prevent-close"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-[#333] mb-1">Frame Options</div>
          
          <button 
            className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors flex items-center gap-2"
            onClick={() => { onDuplicateFrame(pageIndex, contextMenu.frameId); setContextMenu(null); }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
            Duplicate Frame
          </button>

          <button 
            className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors flex items-center gap-2"
            onClick={() => { onToggleSpread(pageIndex, contextMenu.frameId); setContextMenu(null); }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"/></svg>
            {config.frames.find(f => f.id === contextMenu.frameId)?.isSpread ? 'Contract to Page' : 'Make Full Spread'}
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

          <div className="px-3 py-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest border-y border-[#333] my-1">Set Aspect Ratio</div>
          
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
          
           <div className="px-4 py-2 border-t border-[#333]">
             <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Custom Ratio</div>
             <div className="flex items-center gap-1.5">
               <div className="flex-1 flex bg-[#0d0d0d] border border-[#333] rounded overflow-hidden h-7">
                  <input 
                    type="number" min="0.1" step="0.5" value={customRatioValues.w}
                    onChange={(e) => { const val = parseFloat(e.target.value); if(!isNaN(val)) setCustomRatioValues(prev => ({...prev, w: val})); }}
                    className="w-full h-full bg-transparent text-white text-[10px] font-bold text-center outline-none border-none p-0 appearance-none"
                  />
                  <div className="flex flex-col border-l border-[#333] shrink-0 w-4">
                     <button onClick={() => setCustomRatioValues(p => ({...p, w: (Number(p.w)||0) + 0.5}))} className="h-1/2 flex items-center justify-center hover:bg-[#222] text-slate-400 transition-colors"><svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7"/></svg></button>
                     <button onClick={() => setCustomRatioValues(p => ({...p, w: Math.max(0.1, (Number(p.w)||0) - 0.5)}))} className="h-1/2 flex items-center justify-center hover:bg-[#222] text-slate-400 border-t border-[#333] transition-colors"><svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg></button>
                  </div>
               </div>
               <span className="text-[10px] text-slate-600 font-bold">:</span>
               <div className="flex-1 flex bg-[#0d0d0d] border border-[#333] rounded overflow-hidden h-7">
                  <input 
                    type="number" min="0.1" step="0.5" value={customRatioValues.h}
                    onChange={(e) => { const val = parseFloat(e.target.value); if(!isNaN(val)) setCustomRatioValues(prev => ({...prev, h: val})); }}
                    className="w-full h-full bg-transparent text-white text-[10px] font-bold text-center outline-none border-none p-0 appearance-none"
                  />
                  <div className="flex flex-col border-l border-[#333] shrink-0 w-4">
                     <button onClick={() => setCustomRatioValues(p => ({...p, h: (Number(p.h)||0) + 0.5}))} className="h-1/2 flex items-center justify-center hover:bg-[#222] text-slate-400 transition-colors"><svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7"/></svg></button>
                     <button onClick={() => setCustomRatioValues(p => ({...p, h: Math.max(0.1, (Number(p.h)||0) - 0.5)}))} className="h-1/2 flex items-center justify-center hover:bg-[#222] text-slate-400 border-t border-[#333] transition-colors"><svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg></button>
                  </div>
               </div>
               <button onClick={() => { if(customRatioValues.w > 0 && customRatioValues.h > 0) applyAspectRatio(contextMenu.frameId, customRatioValues.w / customRatioValues.h); }} className="w-7 h-7 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded shadow-lg ml-1 shrink-0"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg></button>
             </div>
          </div>

          <div className="h-px bg-[#333] my-1" />

          {config.frames.find(f => f.id === contextMenu.frameId)?.imageId && (
             <button 
               className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
               onClick={() => {
                 onUpdateFrame(pageIndex, contextMenu.frameId, { imageId: null });
                 setContextMenu(null);
               }}
             >
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
               Remove Photo
             </button>
          )}
          
          <button 
            className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:bg-red-600 hover:text-white transition-colors"
            onClick={() => {
              onDeleteFrame(pageIndex, contextMenu.frameId);
              setContextMenu(null);
            }}
          >
            Delete Frame
          </button>
        </div>,
        document.body
      )}

      {/* Improved Snap Guidelines */}
      {activeGuides.x.map((guide, i) => (
        <div 
            key={`gx-${i}`} 
            className={`absolute top-0 bottom-0 w-px z-[60] pointer-events-none transition-opacity duration-200 ${
                guide.type === 'spine' ? 'bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.8)]' : 
                guide.type === 'center' ? 'bg-cyan-400' : 'bg-blue-500/50 dashed-line'
            }`} 
            style={{ left: `${guide.pos}%` }} 
        />
      ))}
      {activeGuides.y.map((guide, i) => (
        <div 
            key={`gy-${i}`} 
            className={`absolute left-0 right-0 h-px z-[60] pointer-events-none transition-opacity duration-200 ${
                guide.type === 'center' ? 'bg-cyan-400' : 'bg-blue-500/50 dashed-line'
            }`} 
            style={{ top: `${guide.pos}%` }} 
        />
      ))}

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
                               <div className="w-4 h-4 bg-white/90 backdrop-blur shadow-lg rounded flex items-center justify-center text-slate-800">
                                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                               </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 bg-white/90 backdrop-blur p-2 rounded shadow-lg" onMouseDown={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-1.5">
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
