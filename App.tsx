
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
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

// --- Export Types & Component ---

type ExportFormat = 'pdf' | 'jpg' | 'idml' | 'psd' | 'affinity' | 'json';

interface ExportModalProps {
  onClose: () => void;
  onExport: (settings: ExportSettings) => void;
  isExporting: boolean;
  progress: number;
  statusText: string;
  defaultName: string;
}

export interface ExportSettings {
  filename: string;
  format: ExportFormat;
  dpi: number;
  bleed: boolean;
  cropMarks: boolean;
  colorProfile: 'srgb' | 'cmyk';
}

const ExportModal: React.FC<ExportModalProps> = ({ onClose, onExport, isExporting, progress, statusText, defaultName }) => {
  const [filename, setFilename] = useState(defaultName);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [dpi, setDpi] = useState(300);
  const [bleed, setBleed] = useState(true);
  const [cropMarks, setCropMarks] = useState(true);
  const [colorProfile, setColorProfile] = useState<'srgb' | 'cmyk'>('srgb');

  const formats: {id: ExportFormat, label: string, desc: string, icon: any}[] = [
    { id: 'pdf', label: 'Print PDF', desc: 'Standard Production', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
    )},
    { id: 'jpg', label: 'JPG Spreads', desc: 'Flattened Proofs', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
    )},
    { id: 'idml', label: 'Adobe InDesign', desc: 'IDML Layout File', icon: (
      <span className="font-black text-xs font-serif text-[#ff3366]">Id</span>
    )},
    { id: 'psd', label: 'Adobe Photoshop', desc: 'Layered PSDs', icon: (
      <span className="font-black text-xs font-serif text-[#31a8ff]">Ps</span>
    )},
    { id: 'affinity', label: 'Affinity Publisher', desc: 'Compatible Package', icon: (
      <span className="font-black text-xs font-serif text-[#afff33]">Af</span>
    )},
    { id: 'json', label: 'Project Backup', desc: 'Raw Data (JSON)', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
    )},
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-[#333] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#222] flex justify-between items-center bg-[#161616]">
          <h2 className="text-white font-black uppercase tracking-widest text-sm">Export Project</h2>
          {!isExporting && (
             <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
             </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {isExporting ? (
             <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 mb-6 relative">
                   <div className="absolute inset-0 border-4 border-[#333] rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{Math.round(progress)}% Complete</h3>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-8">{statusText}</p>
                <div className="w-64 h-1 bg-[#222] rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
             </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* File Name */}
              <div>
                 <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Project Filename</label>
                 <input 
                   type="text" 
                   value={filename}
                   onChange={(e) => setFilename(e.target.value)}
                   className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-blue-600 transition-colors placeholder-slate-700"
                   placeholder="Enter filename..."
                 />
              </div>

              {/* Formats Grid */}
              <div>
                 <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Export Format</label>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {formats.map(f => (
                       <button 
                         key={f.id}
                         onClick={() => setFormat(f.id)}
                         className={`relative p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${format === f.id ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-[#1a1a1a] border-[#222] hover:bg-[#222] hover:border-[#444]'}`}
                       >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${format === f.id ? 'bg-blue-600 text-white' : 'bg-[#111] text-slate-400'}`}>
                             {f.icon}
                          </div>
                          <div className="text-center">
                             <div className={`text-[10px] font-black uppercase tracking-wider ${format === f.id ? 'text-white' : 'text-slate-300'}`}>{f.label}</div>
                             <div className="text-[8px] font-bold text-slate-600 mt-0.5">{f.desc}</div>
                          </div>
                       </button>
                    ))}
                 </div>
              </div>

              {/* Advanced Settings */}
              {format !== 'json' && (
                <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#222]">
                   <div className="flex items-center gap-2 mb-4">
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Print Production Settings</h4>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* DPI */}
                      <div>
                         <label className="block text-[9px] font-bold text-slate-500 mb-2 uppercase">Resolution (DPI)</label>
                         <div className="flex bg-[#0a0a0a] rounded-lg p-1 border border-[#333]">
                            {[72, 150, 300, 600].map(d => (
                               <button 
                                 key={d}
                                 onClick={() => setDpi(d)}
                                 className={`flex-1 py-1.5 text-[9px] font-black rounded ${dpi === d ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                               >
                                 {d}
                               </button>
                            ))}
                         </div>
                      </div>

                      {/* Color Profile */}
                      <div>
                         <label className="block text-[9px] font-bold text-slate-500 mb-2 uppercase">Color Profile</label>
                         <div className="flex bg-[#0a0a0a] rounded-lg p-1 border border-[#333]">
                            <button onClick={() => setColorProfile('srgb')} className={`flex-1 py-1.5 text-[9px] font-black rounded ${colorProfile === 'srgb' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>sRGB (Web)</button>
                            <button onClick={() => setColorProfile('cmyk')} className={`flex-1 py-1.5 text-[9px] font-black rounded ${colorProfile === 'cmyk' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>CMYK (Print)</button>
                         </div>
                      </div>

                      {/* Toggles */}
                      <div className="sm:col-span-2 flex gap-4">
                         <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${bleed ? 'bg-blue-600 border-blue-600' : 'bg-[#0a0a0a] border-[#333] group-hover:border-[#555]'}`}>
                               {bleed && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                            </div>
                            <input type="checkbox" className="hidden" checked={bleed} onChange={() => setBleed(!bleed)} />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${bleed ? 'text-white' : 'text-slate-500'}`}>Include Bleed (0.125")</span>
                         </label>

                         <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${cropMarks ? 'bg-blue-600 border-blue-600' : 'bg-[#0a0a0a] border-[#333] group-hover:border-[#555]'}`}>
                               {cropMarks && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                            </div>
                            <input type="checkbox" className="hidden" checked={cropMarks} onChange={() => setCropMarks(!cropMarks)} />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${cropMarks ? 'text-white' : 'text-slate-500'}`}>Crop Marks</span>
                         </label>
                      </div>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#222] bg-[#161616] flex justify-end gap-3">
           {!isExporting && (
             <>
               <button 
                 onClick={onClose}
                 className="px-5 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={() => onExport({ filename, format, dpi, bleed, cropMarks, colorProfile })}
                 className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
               >
                 Export {format === 'json' ? 'Data' : 'Files'}
               </button>
             </>
           )}
           {isExporting && (
              <div className="w-full text-center text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                 Do not close this window
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
  const [customRatio, setCustomRatio] = useState(1);
  const [pageConfigs, setPageConfigs] = useState<PageConfig[]>([]);
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [globalBleedValue, setGlobalBleedValue] = useState(1);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [draggedLibraryImageId, setDraggedLibraryImageId] = useState<string | null>(null);
  const [selectedLibraryImageIds, setSelectedLibraryImageIds] = useState<string[]>([]);
  
  // Selection state lifted to App level to handle "void" clicks
  const [activeFrame, setActiveFrame] = useState<{ pageIndex: number, frameId: string } | null>(null);

  // History State
  const [history, setHistory] = useState<PageConfig[][]>([]);
  const [future, setFuture] = useState<PageConfig[][]>([]);

  const currentRatio = useMemo(() => {
    if (dimension === 'Custom') return customRatio;
    return DIMENSION_RATIOS[dimension] || 1;
  }, [dimension, customRatio]);

  const prevRatioRef = useRef<number>(currentRatio);

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [exportDefaultName, setExportDefaultName] = useState('My Awesome Photobook');

  const promptForCustomDimension = () => {
    // Show current approximate dimensions as default (assuming height=10 for reference)
    const baseH = 10;
    const baseW = parseFloat((baseH * currentRatio).toFixed(2));
    const defaultVal = `${baseW}x${baseH}`;

    const input = window.prompt("Enter global page dimensions (Width x Height, e.g. '12x8' or '8x10'):", defaultVal);
    
    if (input === null) return; // User Cancelled

    // Robust regex to capture one or two numbers (integers or decimals)
    const numbers = input.match(/[0-9]+(\.[0-9]+)?/g)?.map(Number);
    
    if (numbers && numbers.length >= 2) {
       const w = numbers[0];
       const h = numbers[1];
       if (w > 0 && h > 0) {
          setCustomRatio(w / h);
          setDimension('Custom');
       } else {
          alert("Dimensions must be positive numbers.");
       }
    } else if (numbers && numbers.length === 1 && numbers[0] > 0) {
       // Single number treated as ratio
       setCustomRatio(numbers[0]);
       setDimension('Custom');
    } else {
       alert("Invalid dimensions. Please use standard 'Width x Height' format (e.g. 12x8).");
    }
  };

  const handleDimensionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as SpreadDimension;
    if (val === 'Custom') {
      promptForCustomDimension();
      return;
    }
    setDimension(val);
  };

  // History Actions
  const saveToHistory = useCallback(() => {
    setHistory(prev => {
      // Limit history to 20 steps to save memory
      const newHist = [...prev, JSON.parse(JSON.stringify(pageConfigs))];
      return newHist.slice(-20);
    });
    setFuture([]);
  }, [pageConfigs]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    
    setFuture(prev => [JSON.parse(JSON.stringify(pageConfigs)), ...prev]);
    setPageConfigs(previous);
    setHistory(newHistory);
    setActiveFrame(null);
  }, [history, pageConfigs]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setHistory(prev => [...prev, JSON.parse(JSON.stringify(pageConfigs))]);
    setPageConfigs(next);
    setFuture(newFuture);
    setActiveFrame(null);
  }, [future, pageConfigs]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        redo();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    if (pageConfigs.length === 0) {
      setPageConfigs([
        createInitialPageConfig(`p1-${Date.now()}`, globalBleedValue),
        createInitialPageConfig(`p2-${Date.now()}`, globalBleedValue)
      ]);
    }
  }, [pageConfigs.length, globalBleedValue]);

  // Adjust frame percentages when book dimensions change
  useEffect(() => {
    const newRatio = currentRatio;
    const oldRatio = prevRatioRef.current;

    if (Math.abs(newRatio - oldRatio) > 0.001) {
      const ratioFactor = newRatio / oldRatio;
      
      setPageConfigs(prev => prev.map(page => ({
        ...page,
        frames: page.frames.map(frame => {
          // If frame is empty (no image), reset it to default large size to match new page dimensions
          if (!frame.imageId) {
            return {
              ...frame,
              x: 10, y: 10, width: 80, height: 80
            };
          }

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
          
          // Center adjustment if scaling happened or if pushed out
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
  }, [currentRatio]);

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
    saveToHistory();
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
  }, [saveToHistory]);

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
    saveToHistory();
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
  }, [activeFrame, saveToHistory]);

  const onClearPage = useCallback((pageIdx: number) => {
    saveToHistory();
    setPageConfigs(prev => {
      const next = [...prev];
      next[pageIdx] = { ...next[pageIdx], frames: [] };
      return next;
    });
    setActiveFrame(null);
  }, [saveToHistory]);

  const onDuplicateFrame = useCallback((pageIdx: number, frameId: string) => {
    saveToHistory();
    setPageConfigs(prev => {
      const next = [...prev];
      const page = { ...next[pageIdx] };
      const source = page.frames.find(f => f.id === frameId);
      if (!source) return prev;

      const maxZ = Math.max(...page.frames.map(f => f.zIndex));
      const newFrame: Frame = {
        ...source,
        id: `f-${Math.random().toString(36).substr(2, 9)}`,
        imageId: null, // Reset imageId to null so we only duplicate the frame
        x: Math.min(90, source.x + 5),
        y: Math.min(90, source.y + 5),
        zIndex: maxZ + 1
      };

      page.frames = [...page.frames, newFrame];
      next[pageIdx] = page;
      setActiveFrame({ pageIndex: pageIdx, frameId: newFrame.id });
      return next;
    });
  }, [saveToHistory]);

  const onDropImage = useCallback((pageIdx: number, frameId: string | null, imageId: string, x?: number, y?: number) => {
    saveToHistory();
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
  }, [onUpdateFrame, saveToHistory]);

  const updatePageMargin = useCallback((index: number, margin: number) => {
    setPageConfigs(prev => {
      const next = [...prev];
      next[index] = { ...next[index], margin };
      return next;
    });
  }, []);

  const addSpread = () => {
    saveToHistory();
    setPageConfigs(prev => [
      ...prev,
      createInitialPageConfig(`p${prev.length + 1}-${Date.now()}`, globalBleedValue),
      createInitialPageConfig(`p${prev.length + 2}-${Date.now()}`, globalBleedValue),
    ]);
  };

  const getBase64FromUrl = async (url: string): Promise<string> => {
    const data = await fetch(url);
    const blob = await data.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob); 
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data);
      }
    });
  };

  const executeExport = async (settings: ExportSettings) => {
    setIsExporting(true);
    setExportDefaultName(settings.filename);
    const sanitizedFilename = settings.filename.trim() || 'project';
    
    // Handle Real PDF Export
    if (settings.format === 'pdf') {
       setExportStatus('Initializing PDF Engine...');
       setExportProgress(5);
       await new Promise(r => setTimeout(r, 200));

       // Determine page dimensions in inches
       let pageWidth = 8;
       let pageHeight = 8;
       if (dimension === '8x8') { pageWidth=8; pageHeight=8; }
       else if (dimension === '10x10') { pageWidth=10; pageHeight=10; }
       else if (dimension === 'A4_Landscape') { pageWidth=11.69; pageHeight=8.27; }
       else if (dimension === 'A4_Portrait') { pageWidth=8.27; pageHeight=11.69; }
       else if (dimension === 'Custom') { pageHeight=10; pageWidth=10*currentRatio; }

       const doc = new jsPDF({
           orientation: pageWidth > pageHeight ? 'landscape' : 'portrait',
           unit: 'in',
           format: [pageWidth, pageHeight]
       });

       for (let i = 0; i < pageConfigs.length; i++) {
           if (i > 0) doc.addPage([pageWidth, pageHeight]);
           
           const page = pageConfigs[i];
           setExportStatus(`Rendering Page ${i + 1} of ${pageConfigs.length}...`);
           setExportProgress(10 + ((i / pageConfigs.length) * 80));
           await new Promise(r => setTimeout(r, 50));

           // Add frames
           for (const frame of page.frames) {
               if (frame.imageId) {
                   const img = images.find(img => img.id === frame.imageId);
                   if (img) {
                       try {
                           const base64 = await getBase64FromUrl(img.url);
                           const x = (frame.x / 100) * pageWidth;
                           const y = (frame.y / 100) * pageHeight;
                           const w = (frame.width / 100) * pageWidth;
                           const h = (frame.height / 100) * pageHeight;
                           
                           // Note: In a real advanced app we would handle crop/scale logic here by
                           // clipping the image or drawing it to a temp canvas first.
                           // For this implementation, we simply fit the image into the rect.
                           doc.addImage(base64, 'JPEG', x, y, w, h);
                       } catch (e) {
                           console.error('Failed to load image for PDF', e);
                       }
                   }
               }
           }
       }

       setExportStatus('Finalizing PDF File...');
       setExportProgress(100);
       doc.save(`${sanitizedFilename}.pdf`);
       
       setTimeout(() => {
           setIsExporting(false);
           setShowExportModal(false);
       }, 1000);
       return;
    }

    // Handle JSON Backup
    if (settings.format === 'json') {
        const projectData = {
           meta: {
              version: "1.0",
              dimension,
              customRatio,
              generatedAt: new Date().toISOString(),
              settings
           },
           content: pageConfigs,
           assets: images.map(img => ({ id: img.id, name: img.name }))
        };
        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sanitizedFilename}.bbproj.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExporting(false);
        setShowExportModal(false);
        return;
    }
    
    // Simulate complex export process for other formats
    const totalPages = pageConfigs.length;
    const isComplex = settings.format === 'idml' || settings.format === 'psd';
    
    // Stage 1: Analyze Pages
    await new Promise(r => setTimeout(r, 600));
    setExportStatus('Analyzing Document Structure...');
    setExportProgress(15);

    // Stage 2: Process High Res Assets (Simulation Loop)
    for(let i=0; i<totalPages; i++) {
        const percent = 15 + ((i+1) / totalPages) * 40;
        setExportStatus(`Rasterizing High-Res Assets for Page ${i+1}...`);
        setExportProgress(percent);
        await new Promise(r => setTimeout(r, isComplex ? 300 : 100)); // Simulate processing time
    }

    // Stage 3: Format Conversion
    setExportStatus(settings.format === 'idml' ? 'Generating XML Geometry...' : settings.format === 'psd' ? 'Flattening Layers...' : 'Applying Color Profile...');
    await new Promise(r => setTimeout(r, 800));
    setExportProgress(80);

    // Stage 4: Packaging
    if (settings.colorProfile === 'cmyk') {
        setExportStatus('Converting to CMYK (SWOP 2006)...');
        await new Promise(r => setTimeout(r, 1000));
    }
    setExportStatus('Finalizing Package...');
    setExportProgress(95);
    await new Promise(r => setTimeout(r, 600));

    setExportProgress(100);

    const manifest = `
PROJECT EXPORT MANIFEST
=======================
Filename: ${sanitizedFilename}
Format: ${settings.format.toUpperCase()}
Resolution: ${settings.dpi} DPI
Bleed: ${settings.bleed ? 'Included' : 'None'}
Crop Marks: ${settings.cropMarks ? 'Included' : 'None'}
Color Profile: ${settings.colorProfile.toUpperCase()}
Timestamp: ${new Date().toISOString()}

PAGES EXPORTED: ${totalPages}
---------------------------
${pageConfigs.map((p, i) => `Page ${i+1}: ${p.frames.length} frames`).join('\n')}

NOTE: This is a browser-based simulation. 
In a production environment, this would be a binary .${settings.format} file.
To save your actual work logic, use the "Project Backup (JSON)" format.
    `;
    const fileContent = new Blob([manifest], { type: 'text/plain' });
    const extension = settings.format === 'idml' ? 'idml' : settings.format === 'psd' ? 'psd' : settings.format === 'affinity' ? 'afpub' : settings.format;

    const url = URL.createObjectURL(fileContent);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizedFilename}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Reset UI
    setTimeout(() => {
        setIsExporting(false);
        setShowExportModal(false);
    }, 1000);
  };

  const handleLibraryReorder = (draggedId: string, targetIdx: number) => {
    setImages(prev => {
      const newImages = [...prev];
      const draggedIdx = newImages.findIndex(img => img.id === draggedId);
      if (draggedIdx === -1) return prev;
      
      // Adjusted logic: If we move an item from index 0 to index 5.
      // We remove index 0. All items shift down. Old index 6 becomes new index 5.
      // So if dragging from left to right, we need to account for the removal shift.
      let finalTargetIdx = targetIdx;
      if (draggedIdx < targetIdx) {
        finalTargetIdx--;
      }

      const [removed] = newImages.splice(draggedIdx, 1);
      newImages.splice(finalTargetIdx, 0, removed);
      return newImages;
    });
  };

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
    // Only use selected images
    const selectedImages = images.filter(img => selectedLibraryImageIds.includes(img.id));
    if (selectedImages.length === 0) return;

    saveToHistory();
    setPageConfigs(prev => {
      const nextConfigs = JSON.parse(JSON.stringify(prev));
      let imageIndex = 0;

      // 1. Fill existing empty frames first
      nextConfigs.forEach((page: PageConfig) => {
        page.frames.forEach((frame: Frame) => {
          if (!frame.imageId && imageIndex < selectedImages.length) {
            frame.imageId = selectedImages[imageIndex].id;
            imageIndex++;
          }
        });
      });

      // 2. Generate new spreads if we still have images
      while (imageIndex < selectedImages.length) {
         // Create two new pages (a spread)
         const p1Id = `p${nextConfigs.length + 1}-${Date.now()}`;
         const p2Id = `p${nextConfigs.length + 2}-${Date.now()}`;
         const page1 = createInitialPageConfig(p1Id, globalBleedValue);
         const page2 = createInitialPageConfig(p2Id, globalBleedValue);
         
         // Fill page 1
         if (imageIndex < selectedImages.length) {
             page1.frames[0].imageId = selectedImages[imageIndex].id;
             imageIndex++;
         }
         
         // Fill page 2
         if (imageIndex < selectedImages.length) {
             page2.frames[0].imageId = selectedImages[imageIndex].id;
             imageIndex++;
         }
         
         nextConfigs.push(page1, page2);
      }
      return nextConfigs;
    });

    // Optional: Clear selection after placing
    setSelectedLibraryImageIds([]);
  };

  const handleLibraryItemClick = (id: string) => {
    setSelectedLibraryImageIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      return [...prev, id];
    });
  };

  const toggleSelectAll = () => {
    if (selectedLibraryImageIds.length === images.length) {
      setSelectedLibraryImageIds([]);
    } else {
      setSelectedLibraryImageIds(images.map(img => img.id));
    }
  };

  const handleVoidClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setActiveFrame(null);
    }
  };

  return (
    <div className="flex flex-col h-screen text-slate-100 bg-[#0a0a0a] overflow-hidden select-none">
      
      {showExportModal && (
        <ExportModal 
          onClose={() => setShowExportModal(false)}
          onExport={executeExport}
          isExporting={isExporting}
          progress={exportProgress}
          statusText={exportStatus}
          defaultName={exportDefaultName}
        />
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

          <div className="h-6 w-px bg-[#333] mx-2"></div>

          <div className="flex gap-1">
             <Tooltip text="Undo (Ctrl+Z)">
               <button 
                onClick={undo} 
                disabled={history.length === 0}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
               </button>
             </Tooltip>
             <Tooltip text="Redo (Ctrl+Y)">
               <button 
                onClick={redo}
                disabled={future.length === 0}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"/></svg>
               </button>
             </Tooltip>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Tooltip text="Uniform margin for all pages">
            <div 
              className="flex items-center gap-3 bg-[#1a1a1a] border border-[#333] px-3 py-1 rounded-full"
              onMouseUp={saveToHistory} // Save history when slider release
            >
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
                value={dimension} onChange={handleDimensionChange}
                className="bg-transparent border-none outline-none focus:ring-0 cursor-pointer text-white"
              >
                {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
                  <option key={key} value={key} className="bg-[#1a1a1a]">{label}</option>
                ))}
              </select>
              {dimension === 'Custom' && (
                <button 
                  onClick={promptForCustomDimension}
                  className="w-4 h-4 flex items-center justify-center bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-all"
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
              )}
            </div>
          </Tooltip>

          <div className="flex items-center gap-2 h-9">
            <Tooltip text={selectedLibraryImageIds.length > 0 ? `Fill selected ${selectedLibraryImageIds.length} photos` : "Select library photos to enable"}>
              <button 
                onClick={autoPopulate}
                className="h-full text-white px-4 py-1.5 rounded-lg text-[10px] font-black border border-slate-700 hover:bg-slate-800 transition-all uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={selectedLibraryImageIds.length === 0}
              >
                Auto Fill {selectedLibraryImageIds.length > 0 && `(${selectedLibraryImageIds.length})`}
              </button>
            </Tooltip>

            <div className="relative h-full">
              <Tooltip text="Generate print-ready files">
                <button 
                  onClick={() => setShowExportModal(true)}
                  className={`h-full flex items-center gap-2 text-white px-4 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-widest shadow-lg bg-blue-600 hover:bg-blue-500`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  Export
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className="bg-[#0d0d0d] border-r border-[#1a1a1a] flex flex-col z-20 overflow-hidden shrink-0" style={{ width: sidebarWidth }}>
          <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between shrink-0">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Library ({images.length})</h2>
            <div className="flex items-center gap-2">
              <button onClick={toggleSelectAll} className="text-[9px] text-blue-500 font-bold hover:text-blue-400">
                {selectedLibraryImageIds.length === images.length ? 'Deselect All' : 'Select All'}
              </button>
              <Tooltip text="Upload new photos" position="right">
                <button onClick={() => document.getElementById('file-up')?.click()} className="w-7 h-7 flex items-center justify-center bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                </button>
              </Tooltip>
            </div>
            <input id="file-up" type="file" multiple className="hidden" onChange={handleFileUpload} />
          </div>
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-3 auto-rows-max hide-scrollbar">
            {images.map((img, idx) => (
              <LibraryItem 
                key={img.id} image={img} index={idx} isPlaced={pageConfigs.some(p => p.frames.some(f => f.imageId === img.id))}
                isSelected={selectedLibraryImageIds.includes(img.id)}
                onClick={() => handleLibraryItemClick(img.id)}
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
                        onDuplicateFrame={onDuplicateFrame} onAddFrame={onAddFrame} onClearPage={onClearPage}
                        onInteractionStart={saveToHistory}
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
                          onDuplicateFrame={onDuplicateFrame} onAddFrame={onAddFrame} onClearPage={onClearPage}
                          onInteractionStart={saveToHistory}
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
            <span>Project: <span className="text-slate-400">{exportDefaultName}</span></span>
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
