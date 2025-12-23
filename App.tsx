
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { PhotoImage, SpreadDimension, PageConfig, Frame, ImageOffset } from './types';
import { DIMENSION_RATIOS, DIMENSION_LABELS, INITIAL_IMAGES } from './constants';
import { LibraryItem } from './components/LibraryItem';
import { Page } from './components/Page';

// Smarter Tooltip component that avoids being cut off
export const Tooltip: React.FC<{ text: string, children: React.ReactNode, position?: 'top' | 'bottom' | 'left' | 'right' }> = ({ text, children, position = 'top' }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - 8;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 8;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 8;
        break;
    }
    setCoords({ top, left });
  };

  const handleEnter = () => {
    updatePosition();
    timerRef.current = window.setTimeout(() => setVisible(true), 500);
  };
  
  const handleLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  const positionClasses = {
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    left: '-translate-x-full -translate-y-1/2',
    right: '-translate-y-1/2'
  };

  return (
    <div className="relative inline-block" ref={triggerRef} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      {visible && (
        <div 
          className={`fixed z-[999] px-2 py-1 bg-black/95 text-[9px] font-black uppercase tracking-widest text-white rounded border border-white/10 whitespace-nowrap shadow-2xl pointer-events-none transition-opacity duration-200 ${positionClasses[position]}`}
          style={{ top: coords.top, left: coords.left }}
        >
          {text}
          <div className={`absolute w-1.5 h-1.5 bg-black/95 border-b border-r border-white/10 rotate-45 ${
            position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
            position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2 border-t border-l border-b-0 border-r-0' :
            position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2 border-t border-r border-b-0 border-l-0' :
            'left-[-4px] top-1/2 -translate-y-1/2 border-b border-l border-t-0 border-r-0'
          }`} />
        </div>
      )}
    </div>
  );
};

interface PageActionBarProps {
  index: number;
  config: PageConfig;
  zoomLevel: number;
  width: number;
  onAddFrame: (index: number) => void;
  updatePageMargin: (index: number, margin: number) => void;
}

const PageActionBar: React.FC<PageActionBarProps> = ({ 
  index, 
  config, 
  zoomLevel, 
  onAddFrame, 
  updatePageMargin
}) => {
  const [showBleedSlider, setShowBleedSlider] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowBleedSlider(false);
      }
    };
    if (showBleedSlider) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBleedSlider]);

  return (
    <div className={`absolute -bottom-14 left-0 w-full flex items-center justify-between gap-1 px-3 py-2 bg-[#1a1a1a] border-t border-[#333] rounded-b shadow-2xl transition-all border-x border-b ${zoomLevel < 0.4 ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100'} z-20`}>
      <div className="flex items-center gap-3 flex-1">
        <Tooltip text="Create a new empty image frame">
          <button 
            onClick={() => onAddFrame(index)}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase transition-all shadow-lg active:scale-95"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4"/></svg>
            Add Frame
          </button>
        </Tooltip>

        <div className="h-6 w-px bg-[#333]"></div>

        <div className="relative" ref={containerRef}>
          <Tooltip text="Adjust page safe zone and margins">
            <button 
              onClick={() => setShowBleedSlider(!showBleedSlider)}
              className={`px-2 py-1.5 rounded border border-[#333] text-[9px] font-black uppercase transition-all bg-[#222] ${config.margin > 0 ? 'text-blue-400 border-blue-900/40' : 'text-slate-500'}`}
            >
              Margin: {config.margin}"
            </button>
          </Tooltip>
          {showBleedSlider && (
            <div className="absolute bottom-full mb-3 left-0 bg-[#1a1a1a] border border-[#333] p-4 rounded-xl shadow-2xl flex flex-col gap-2 min-w-[140px] z-50">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[8px] font-black text-slate-500 uppercase">Local Page Margin</span>
                <span className="text-[8px] font-black text-blue-400">{config.margin}"</span>
              </div>
              <input 
                type="range" min="0" max="10" step="0.5" 
                value={config.margin} 
                onChange={(e) => updatePageMargin(index, parseFloat(e.target.value))}
                className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [images, setImages] = useState<PhotoImage[]>(INITIAL_IMAGES);
  const [dimension, setDimension] = useState<SpreadDimension>('8x8');
  const [pageConfigs, setPageConfigs] = useState<PageConfig[]>([]);
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [globalBleedValue, setGlobalBleedValue] = useState(1);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [draggedLibraryImageId, setDraggedLibraryImageId] = useState<string | null>(null);
  
  // Selection state lifted to App level to handle "void" clicks
  const [activeFrame, setActiveFrame] = useState<{ pageIndex: number, frameId: string } | null>(null);

  const prevRatioRef = useRef<number>(DIMENSION_RATIOS[dimension] || 1);

  // Export state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'jpg'>('pdf');
  const [exportDpi, setExportDpi] = useState<72 | 150 | 300>(300);
  const [exportFilename, setExportFilename] = useState('My Awesome Photobook');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pageConfigs.length === 0) {
      setPageConfigs([
        createInitialPageConfig(`p1-${Date.now()}`, globalBleedValue),
        createInitialPageConfig(`p2-${Date.now()}`, globalBleedValue)
      ]);
    }
  }, [pageConfigs.length, globalBleedValue]);

  // Adjust frame percentages when book dimensions change to preserve visual size/aspect ratio
  useEffect(() => {
    const newRatio = DIMENSION_RATIOS[dimension] || 1;
    const oldRatio = prevRatioRef.current;

    if (newRatio !== oldRatio) {
      const ratioFactor = newRatio / oldRatio;
      
      setPageConfigs(prev => prev.map(page => ({
        ...page,
        frames: page.frames.map(frame => {
          let newWidth = frame.width;
          let newHeight = frame.height * ratioFactor;
          let newX = frame.x;
          let newY = frame.y * ratioFactor;

          // If frame height now overflows the page, scale both dimensions down to fit while keeping aspect
          if (newHeight > 100) {
            const scaleDown = 100 / newHeight;
            newHeight = 100;
            newWidth = newWidth * scaleDown;
          }
          
          // Center adjustment if scaling happened
          newY = Math.max(0, Math.min(100 - newHeight, newY));
          newX = Math.max(0, Math.min(100 - newWidth, newX));

          return {
            ...frame,
            width: newWidth,
            height: newHeight,
            x: newX,
            y: newY
          };
        })
      })));
      prevRatioRef.current = newRatio;
      setActiveFrame(null);
    }
  }, [dimension]);

  // Sidebar resizing logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return;
      const newWidth = Math.max(200, Math.min(600, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };

    if (isResizingSidebar) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  function createInitialPageConfig(id: string, margin: number): PageConfig {
    return {
      id,
      margin,
      frames: [{
        id: `f-${Math.random().toString(36).substr(2, 9)}`,
        imageId: null,
        x: 10, y: 10, width: 80, height: 80, zIndex: 1,
        cropType: 'fill', scale: 1, offset: { x: 50, y: 50 },
        isLocked: true
      }]
    };
  }

  const handleGlobalBleedChange = (val: number) => {
    setGlobalBleedValue(val);
    setPageConfigs(prev => prev.map(page => ({ ...page, margin: val })));
  };

  const onAddFrame = useCallback((pageIdx: number, x?: number, y?: number) => {
    setPageConfigs(prev => {
      const next = [...prev];
      const page = { ...next[pageIdx] };
      
      const maxZ = page.frames.length > 0 ? Math.max(...page.frames.map(f => f.zIndex)) : 0;
      
      const newFrame: Frame = {
        id: `f-${Math.random().toString(36).substr(2, 9)}`,
        imageId: null,
        x: x !== undefined ? x - 20 : 30,
        y: y !== undefined ? y - 20 : 30,
        width: 40,
        height: 40,
        zIndex: maxZ + 1,
        cropType: 'fill',
        scale: 1,
        offset: { x: 50, y: 50 },
        isLocked: true
      };
      newFrame.x = Math.max(0, Math.min(60, newFrame.x));
      newFrame.y = Math.max(0, Math.min(60, newFrame.y));
      page.frames = [...page.frames, newFrame];
      next[pageIdx] = page;

      setActiveFrame({ pageIndex: pageIdx, frameId: newFrame.id });
      
      return next;
    });
  }, []);

  const onUpdateFrame = useCallback((pageIdx: number, frameId: string, updates: Partial<Frame>) => {
    setPageConfigs(prev => {
      const next = [...prev];
      const page = { ...next[pageIdx] };
      page.frames = page.frames.map(f => f.id === frameId ? { ...f, ...updates } : f);
      next[pageIdx] = page;
      return next;
    });
  }, []);

  const onDeleteFrame = useCallback((pageIdx: number, frameId: string) => {
    setPageConfigs(prev => {
      const next = [...prev];
      const page = { ...next[pageIdx] };
      page.frames = page.frames.filter(f => f.id !== frameId);
      next[pageIdx] = page;
      return next;
    });
    if (activeFrame?.frameId === frameId) {
      setActiveFrame(null);
    }
  }, [activeFrame]);

  const onDuplicateFrame = useCallback((pageIdx: number, frameId: string) => {
    setPageConfigs(prev => {
      const next = [...prev];
      const page = { ...next[pageIdx] };
      const source = page.frames.find(f => f.id === frameId);
      if (!source) return prev;

      const maxZ = Math.max(...page.frames.map(f => f.zIndex));
      const newFrame: Frame = {
        ...source,
        id: `f-${Math.random().toString(36).substr(2, 9)}`,
        x: Math.min(90, source.x + 5),
        y: Math.min(90, source.y + 5),
        zIndex: maxZ + 1
      };

      page.frames = [...page.frames, newFrame];
      next[pageIdx] = page;
      setActiveFrame({ pageIndex: pageIdx, frameId: newFrame.id });
      return next;
    });
  }, []);

  const onDropImage = useCallback((pageIdx: number, frameId: string | null, imageId: string, x?: number, y?: number) => {
    if (frameId) {
      onUpdateFrame(pageIdx, frameId, { imageId });
      setActiveFrame({ pageIndex: pageIdx, frameId });
    } else {
      setPageConfigs(prev => {
        const next = [...prev];
        const page = { ...next[pageIdx] };
        
        const maxZ = page.frames.length > 0 ? Math.max(...page.frames.map(f => f.zIndex)) : 0;
        
        const newFrame: Frame = {
          id: `f-${Math.random().toString(36).substr(2, 9)}`,
          imageId: imageId,
          x: x !== undefined ? x - 15 : 35,
          y: y !== undefined ? y - 15 : 35,
          width: 30,
          height: 30,
          zIndex: maxZ + 1,
          cropType: 'fill',
          scale: 1,
          offset: { x: 50, y: 50 },
          isLocked: true
        };
        newFrame.x = Math.max(0, Math.min(70, newFrame.x));
        newFrame.y = Math.max(0, Math.min(70, newFrame.y));
        page.frames = [...page.frames, newFrame];
        next[pageIdx] = page;
        
        setActiveFrame({ pageIndex: pageIdx, frameId: newFrame.id });
        
        return next;
      });
    }
  }, [onUpdateFrame]);

  const updatePageMargin = useCallback((index: number, margin: number) => {
    setPageConfigs(prev => {
      const next = [...prev];
      next[index] = { ...next[index], margin };
      return next;
    });
  }, []);

  const addSpread = () => {
    setPageConfigs(prev => [
      ...prev,
      createInitialPageConfig(`p${prev.length + 1}-${Date.now()}`, globalBleedValue),
      createInitialPageConfig(`p${prev.length + 2}-${Date.now()}`, globalBleedValue),
    ]);
  };

  const startExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setShowExportMenu(false);

    for (let i = 0; i <= 100; i += 10) {
      setExportProgress(i);
      await new Promise(r => setTimeout(r, 200));
    }

    const sanitizedFilename = exportFilename.trim() || 'photobook_export';
    const dummyBlob = new Blob(['Mock Photobook Content'], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(dummyBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizedFilename}.${exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsExporting(false);
  };

  const handleLibraryReorder = (draggedId: string, targetIdx: number) => {
    setImages(prev => {
      const newImages = [...prev];
      const draggedIdx = newImages.findIndex(img => img.id === draggedId);
      if (draggedIdx === -1) return prev;
      const [removed] = newImages.splice(draggedIdx, 1);
      newImages.splice(targetIdx, 0, removed);
      return newImages;
    });
  };

  const currentRatio = useMemo(() => DIMENSION_RATIOS[dimension] || 1, [dimension]);
  
  const dynamicPageWidth = useMemo(() => {
    const BASE_PAGE_WIDTH = 480; 
    return Math.max(100, BASE_PAGE_WIDTH * zoomLevel);
  }, [zoomLevel]);

  const spreads = useMemo(() => {
    const s = [];
    for (let i = 0; i < pageConfigs.length; i += 2) {
      s.push({ leftIdx: i, rightIdx: i + 1 < pageConfigs.length ? i + 1 : null });
    }
    return s;
  }, [pageConfigs]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPhotos: PhotoImage[] = (Array.from(files) as File[])
        .filter(file => file.type.startsWith('image/'))
        .map((file) => ({
          id: Math.random().toString(36).substr(2, 9),
          url: URL.createObjectURL(file),
          name: file.name,
          aspectRatio: 1
        }));
      setImages(prev => [...prev, ...newPhotos]);
    }
  };

  const autoPopulate = () => {
    if (images.length === 0) return;
    setPageConfigs(prev => {
      const next = [...prev];
      let imgIdx = 0;
      next.forEach(page => {
        page.frames = page.frames.map(frame => {
          const img = images[imgIdx++];
          return img ? { ...frame, imageId: img.id } : frame;
        });
      });
      return next;
    });
  };

  const handleVoidClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setActiveFrame(null);
    }
  };

  return (
    <div className="flex flex-col h-screen text-slate-100 bg-[#0a0a0a] overflow-hidden select-none">
      {isExporting && (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8">
           <div className="w-64 h-1 bg-[#222] rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-blue-500 transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                style={{ width: `${exportProgress}%` }}
              />
           </div>
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Rendering {exportFormat.toUpperCase()} • {exportDpi} DPI</p>
           <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500 mt-2">Compiling High-Res Assets...</p>
        </div>
      )}

      <header className="h-16 border-b bg-[#111]/80 backdrop-blur-xl border-[#222] px-6 flex items-center justify-between z-40 shrink-0">
        <div className="flex items-center gap-4">
          <Tooltip text="BookBaby Project Studio" position="right">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 px-2 py-0.5 rounded shadow-lg border border-blue-400/30">
                  <span className="text-white font-black text-xl leading-none tracking-tighter">BB</span>
                </div>
                <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-[0.35em] mt-1 leading-none">BookBaby</span>
              </div>
            </div>
          </Tooltip>
        </div>
        
        <div className="flex items-center gap-4">
          <Tooltip text="Uniform margin for all pages">
            <div className="flex items-center gap-3 bg-[#1a1a1a] border border-[#333] px-3 py-1 rounded-full">
               <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"/></svg>
               <input 
                type="range" min="0" max="4" step="0.1" 
                value={globalBleedValue} 
                onChange={(e) => handleGlobalBleedChange(parseFloat(e.target.value))}
                className="w-20 h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-[9px] font-black text-blue-400 w-8 text-center">{globalBleedValue}"</span>
            </div>
          </Tooltip>

          <Tooltip text="Magnification">
            <div className="flex items-center gap-3 bg-[#1a1a1a] border border-[#333] px-3 py-1 rounded-full">
              <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/></svg>
              <input 
                type="range" min="0.2" max="2.0" step="0.1" value={zoomLevel} 
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                className="w-20 h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-[9px] font-black text-slate-300 w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
            </div>
          </Tooltip>

          <Tooltip text="Change photobook size">
            <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#333] px-3 py-1 rounded-lg text-[10px] font-bold">
              <select 
                value={dimension} onChange={(e) => setDimension(e.target.value as SpreadDimension)}
                className="bg-transparent border-none outline-none focus:ring-0 cursor-pointer text-white"
              >
                {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
                  <option key={key} value={key} className="bg-[#1a1a1a]">{label}</option>
                ))}
              </select>
            </div>
          </Tooltip>

          <div className="flex items-center gap-2 h-9">
            <Tooltip text="Fill all empty frames automatically">
              <button 
                onClick={autoPopulate}
                className="h-full text-white px-4 py-1.5 rounded-lg text-[10px] font-black border border-slate-700 hover:bg-slate-800 transition-all uppercase tracking-widest disabled:opacity-30"
                disabled={images.length === 0}
              >
                Auto Fill
              </button>
            </Tooltip>

            <div className="relative h-full" ref={exportRef}>
              <Tooltip text="Generate print-ready files">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className={`h-full flex items-center gap-2 text-white px-4 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-widest shadow-lg ${showExportMenu ? 'bg-blue-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  Export
                </button>
              </Tooltip>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-3 w-72 bg-[#161616] border border-[#222] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-5 z-[100]">
                  <div className="flex flex-col gap-6">
                    <div>
                      <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Project Filename</h4>
                      <input 
                        type="text"
                        value={exportFilename}
                        onChange={(e) => setExportFilename(e.target.value)}
                        placeholder="Project Name"
                        className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-[11px] font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div>
                      <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Output Format</h4>
                      <div className="flex p-1 bg-[#0d0d0d] rounded-lg border border-[#222]">
                        <button 
                          onClick={() => setExportFormat('pdf')}
                          className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded ${exportFormat === 'pdf' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          PDF
                        </button>
                        <button 
                          onClick={() => setExportFormat('jpg')}
                          className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded ${exportFormat === 'jpg' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          JPG
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Resolution (DPI)</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {[72, 150, 300].map(dpi => (
                          <button 
                            key={dpi}
                            onClick={() => setExportDpi(dpi as any)}
                            className={`py-2 text-[9px] font-black border rounded-lg transition-all ${exportDpi === dpi ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-transparent border-[#222] text-slate-500 hover:border-slate-700'}`}
                          >
                            {dpi}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={startExport}
                      className="w-full py-3 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-lg hover:bg-slate-200 transition-colors shadow-2xl active:scale-95"
                    >
                      Download {exportFormat.toUpperCase()}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className="bg-[#0d0d0d] border-r border-[#1a1a1a] flex flex-col z-20 overflow-hidden shrink-0" style={{ width: sidebarWidth }}>
          <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between shrink-0">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Library ({images.length})</h2>
            <Tooltip text="Upload new photos" position="right">
              <button onClick={() => document.getElementById('file-up')?.click()} className="w-7 h-7 flex items-center justify-center bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
              </button>
            </Tooltip>
            <input id="file-up" type="file" multiple className="hidden" onChange={handleFileUpload} />
          </div>
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 auto-rows-max hide-scrollbar">
            {images.map((img, idx) => (
              <LibraryItem 
                key={img.id} image={img} index={idx} isPlaced={pageConfigs.some(p => p.frames.some(f => f.imageId === img.id))}
                onDragStart={(e) => {
                  e.dataTransfer.setData('imageId', img.id);
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggedLibraryImageId(img.id);
                }}
                onDragOver={(e, index, side) => {
                  e.preventDefault();
                }}
                onDrop={(e, targetIdx) => {
                  e.preventDefault();
                  const droppedImageId = e.dataTransfer.getData('imageId');
                  if (draggedLibraryImageId === droppedImageId) {
                    handleLibraryReorder(droppedImageId, targetIdx);
                  }
                  setDraggedLibraryImageId(null);
                }}
                onDelete={(id) => setImages(prev => prev.filter(i => i.id !== id))}
              />
            ))}
          </div>
        </aside>

        <div 
          className="w-1.5 h-full cursor-col-resize hover:bg-blue-600/50 transition-colors z-[35] shrink-0 bg-transparent"
          onMouseDown={() => setIsResizingSidebar(true)}
        />

        <main 
          className="flex-1 overflow-y-auto bg-[#080808] hide-scrollbar scroll-smooth"
          onMouseDown={handleVoidClick}
        >
          <div 
            className="py-24 px-12 flex flex-wrap justify-center gap-x-24 gap-y-48 min-h-full content-start"
            onMouseDown={handleVoidClick}
          >
            {spreads.map((spread, sIdx) => (
              <div key={sIdx} className="relative group shrink-0">
                <div className="absolute -top-10 left-0 right-0 flex justify-between px-2 opacity-30 group-hover:opacity-100 transition-opacity">
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Spread {sIdx + 1}</span>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pages {spread.leftIdx + 1} & {spread.rightIdx !== null ? spread.rightIdx + 1 : ''}</span>
                </div>

                <div className="flex bg-white shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)] rounded-[1px] overflow-visible">
                   <div className="relative group/page">
                      <Page 
                        pageIndex={spread.leftIdx} config={pageConfigs[spread.leftIdx]} 
                        activeFrameId={activeFrame?.pageIndex === spread.leftIdx ? activeFrame.frameId : null}
                        onSetActiveFrameId={(id) => setActiveFrame(id ? { pageIndex: spread.leftIdx, frameId: id } : null)}
                        libraryImages={images} ratio={currentRatio} width={dynamicPageWidth}
                        onDropImage={onDropImage} onUpdateFrame={onUpdateFrame} onDeleteFrame={onDeleteFrame} 
                        onDuplicateFrame={onDuplicateFrame} onAddFrame={onAddFrame}
                      />
                      <PageActionBar 
                        index={spread.leftIdx} config={pageConfigs[spread.leftIdx]} 
                        zoomLevel={zoomLevel} width={dynamicPageWidth}
                        onAddFrame={onAddFrame} updatePageMargin={updatePageMargin}
                      />
                   </div>

                   {spread.rightIdx !== null && (
                     <div className="relative group/page">
                        <Page 
                          pageIndex={spread.rightIdx} config={pageConfigs[spread.rightIdx]} 
                          activeFrameId={activeFrame?.pageIndex === spread.rightIdx ? activeFrame.frameId : null}
                          onSetActiveFrameId={(id) => setActiveFrame(id ? { pageIndex: spread.rightIdx, frameId: id } : null)}
                          libraryImages={images} ratio={currentRatio} width={dynamicPageWidth}
                          isRightPage onDropImage={onDropImage} onUpdateFrame={onUpdateFrame} onDeleteFrame={onDeleteFrame} 
                          onDuplicateFrame={onDuplicateFrame} onAddFrame={onAddFrame}
                        />
                        <PageActionBar 
                          index={spread.rightIdx} config={pageConfigs[spread.rightIdx]} 
                          zoomLevel={zoomLevel} width={dynamicPageWidth}
                          onAddFrame={onAddFrame} updatePageMargin={updatePageMargin}
                        />
                     </div>
                   )}
                </div>
              </div>
            ))}

            <div className="w-full flex justify-center py-12">
              <Tooltip text="Insert two new blank pages">
                <button 
                  onClick={addSpread} 
                  className="px-20 py-10 bg-[#111] border border-dashed border-[#333] rounded-2xl text-slate-600 text-[11px] font-black uppercase tracking-[0.25em] hover:text-white hover:border-blue-500/50 transition-all shadow-xl group"
                >
                  <span className="group-hover:scale-110 inline-block transition-transform">+ New Spread</span>
                </button>
              </Tooltip>
            </div>
          </div>
        </main>
      </div>

      <footer className="h-8 border-t bg-[#0d0d0d] border-[#1a1a1a] px-6 flex items-center justify-between shrink-0 text-slate-600 text-[8px] font-black uppercase tracking-widest">
         <div className="flex gap-6">
            <span>Project: <span className="text-slate-400">{exportFilename}</span></span>
            <span>Pages: <span className="text-white">{pageConfigs.length}</span></span>
         </div>
         <div className="flex gap-4">
            <span>Powered by BookBaby Engine</span>
         </div>
      </footer>
    </div>
  );
};

export default App;
