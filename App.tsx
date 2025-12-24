
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { PhotoImage, SpreadDimension, PageConfig, Frame, ImageOffset } from './types';
import { DIMENSION_RATIOS, DIMENSION_LABELS, INITIAL_IMAGES } from './constants';
import { LibraryItem } from './components/LibraryItem';
import { Page } from './components/Page';
import { Tooltip } from './components/Tooltip';

// --- Custom Dimension Modal ---
// ... (No changes to CustomDimensionModal, keep as is but I need to include it in the file content for context)
interface CustomDimensionModalProps {
  onClose: () => void;
  onApply: (width: number, height: number) => void;
  currentRatio: number;
}

const CustomDimensionModal: React.FC<CustomDimensionModalProps> = ({ onClose, onApply, currentRatio }) => {
  const [width, setWidth] = useState<number>(() => parseFloat((10 * currentRatio).toFixed(2)));
  const [height, setHeight] = useState<number>(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (width > 0 && height > 0) {
      onApply(width, height);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-[#333] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-[#222] bg-[#161616] flex justify-between items-center">
          <h2 className="text-white font-black uppercase tracking-widest text-xs">Custom Dimensions</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Width (Inches)</label>
              <input 
                type="number" step="0.1" min="1" max="40"
                value={width} onChange={e => setWidth(parseFloat(e.target.value))}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-blue-600 transition-colors text-center"
              />
            </div>
            <span className="text-slate-600 font-bold pt-5">×</span>
            <div className="flex-1">
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Height (Inches)</label>
              <input 
                type="number" step="0.1" min="1" max="40"
                value={height} onChange={e => setHeight(parseFloat(e.target.value))}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-blue-600 transition-colors text-center"
              />
            </div>
          </div>
          
          <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#222]">
            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
              <span>Aspect Ratio</span>
              <span className="text-white">{(width/height).toFixed(3)} : 1</span>
            </div>
          </div>

          <div className="flex gap-3">
             <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-[#222] hover:text-white transition-colors">Cancel</button>
             <button type="submit" className="flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all">Apply Size</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- PageActionBar Component ---

interface PageActionBarProps {
  index: number;
  config: PageConfig;
  zoomLevel: number;
  width?: number;
  onAddFrame: (pageIndex: number, x?: number, y?: number) => void;
  updatePageMargin: (index: number, margin: number) => void;
}

// ... (Keep PageActionBar as is)
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
  scope: 'spreads' | 'pages';
}

const ExportModal: React.FC<ExportModalProps> = ({ onClose, onExport, isExporting, progress, statusText, defaultName }) => {
  const [filename, setFilename] = useState(defaultName);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [dpi, setDpi] = useState(300);
  const [bleed, setBleed] = useState(true);
  const [cropMarks, setCropMarks] = useState(true);
  const [colorProfile, setColorProfile] = useState<'srgb' | 'cmyk'>('srgb');
  const [scope, setScope] = useState<'spreads' | 'pages'>('spreads');

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
        <div className="px-6 py-4 border-b border-[#222] flex justify-between items-center bg-[#161616]">
          <h2 className="text-white font-black uppercase tracking-widest text-sm">Export Project</h2>
          {!isExporting && (
             <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
             </button>
          )}
        </div>
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
              
              <div>
                 <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Export Scope</label>
                 <div className="flex bg-[#0a0a0a] rounded-lg p-1 border border-[#333]">
                    <button 
                        onClick={() => setScope('spreads')} 
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded transition-colors ${scope === 'spreads' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Spreads (2 Pages)
                    </button>
                    <button 
                        onClick={() => setScope('pages')} 
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded transition-colors ${scope === 'pages' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Single Pages
                    </button>
                 </div>
              </div>

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
              {format !== 'json' && (
                <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#222]">
                   <div className="flex items-center gap-2 mb-4">
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Print Production Settings</h4>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                      <div>
                         <label className="block text-[9px] font-bold text-slate-500 mb-2 uppercase">Color Profile</label>
                         <div className="flex bg-[#0a0a0a] rounded-lg p-1 border border-[#333]">
                            <button onClick={() => setColorProfile('srgb')} className={`flex-1 py-1.5 text-[9px] font-black rounded ${colorProfile === 'srgb' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>sRGB (Web)</button>
                            <button onClick={() => setColorProfile('cmyk')} className={`flex-1 py-1.5 text-[9px] font-black rounded ${colorProfile === 'cmyk' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>CMYK (Print)</button>
                         </div>
                      </div>
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
                 onClick={() => onExport({ filename, format, dpi, bleed, cropMarks, colorProfile, scope })}
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
  const [dimension, setDimension] = useState<SpreadDimension>('1:1');
  const [customRatio, setCustomRatio] = useState(1);
  const [pageConfigs, setPageConfigs] = useState<PageConfig[]>([]);
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [globalBleedValue, setGlobalBleedValue] = useState(1);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [draggedLibraryImageId, setDraggedLibraryImageId] = useState<string | null>(null);
  const [selectedLibraryImageIds, setSelectedLibraryImageIds] = useState<string[]>([]);
  const [showDimensionModal, setShowDimensionModal] = useState(false);
  const [activeFrame, setActiveFrame] = useState<{ pageIndex: number, frameId: string } | null>(null);
  const [activeMenuPageIndex, setActiveMenuPageIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<PageConfig[][]>([]);
  const [future, setFuture] = useState<PageConfig[][]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [exportDefaultName, setExportDefaultName] = useState('My Awesome Photobook');

  const currentRatio = useMemo(() => {
    if (dimension === 'Custom') return customRatio;
    return DIMENSION_RATIOS[dimension] || 1;
  }, [dimension, customRatio]);

  const prevRatioRef = useRef<number>(currentRatio);
  const previousDimensionRef = useRef<SpreadDimension>('1:1');

  const handleDimensionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as SpreadDimension;
    if (val === 'Custom') {
      previousDimensionRef.current = dimension;
      setShowDimensionModal(true);
    } else {
      setDimension(val);
    }
  };

  const applyCustomDimensions = (width: number, height: number) => {
    const ratio = width / height;
    setCustomRatio(ratio);
    setDimension('Custom');
    setShowDimensionModal(false);
  };
  
  const cancelCustomDimensions = () => {
    setShowDimensionModal(false);
  };

  const saveToHistory = useCallback(() => {
    setHistory(prev => {
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
        if (e.shiftKey) redo(); else undo();
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
    const newRatio = currentRatio;
    const oldRatio = prevRatioRef.current;
    if (Math.abs(newRatio - oldRatio) > 0.001) {
      const ratioFactor = newRatio / oldRatio;
      setPageConfigs(prev => prev.map(page => ({
        ...page,
        frames: page.frames.map(frame => {
          let newWidth = frame.width;
          let newHeight = frame.height * ratioFactor; 
          let newY = frame.y * ratioFactor;
          let newX = frame.x;
          if (newHeight > 100) {
             const scaleDown = 100 / newHeight;
             newHeight = 100;
             newWidth = newWidth * scaleDown;
             newY = 0;
             newX = Math.max(0, Math.min(100 - newWidth, newX));
          } else if (newY + newHeight > 100) {
             newY = 100 - newHeight;
          }
          return { ...frame, width: newWidth, height: newHeight, x: newX, y: newY };
        })
      })));
      prevRatioRef.current = newRatio;
      setActiveFrame(null);
    }
  }, [currentRatio]);

  const createInitialPageConfig = useCallback((id: string, margin: number): PageConfig => {
    let w = 60; 
    let h = w * currentRatio; 
    if (h > 80) { h = 80; w = h / currentRatio; }
    
    return {
      id, margin,
      frames: [{
        id: `f-${Math.random().toString(36).substr(2, 9)}`,
        imageId: null,
        x: (100 - w) / 2, y: (100 - h) / 2, width: w, height: h, zIndex: 1,
        cropType: 'fill', scale: 1, offset: { x: 50, y: 50 }, isLocked: true
      }]
    };
  }, [currentRatio]);

  useEffect(() => {
    if (pageConfigs.length === 0) {
      setPageConfigs([
        createInitialPageConfig(`p1-${Date.now()}`, globalBleedValue),
        createInitialPageConfig(`p2-${Date.now()}`, globalBleedValue)
      ]);
    }
  }, [pageConfigs.length, globalBleedValue, createInitialPageConfig]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return;
      const newWidth = Math.max(200, Math.min(600, e.clientX));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizingSidebar(false);
    if (isResizingSidebar) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar]);

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
      
      const marginPctX = (page.margin / 16) * 100;
      const marginPctY = marginPctX * currentRatio;
      
      const w = 30;
      const h = w * currentRatio;
      
      let finalX = x !== undefined ? x - (w / 2) : (100 - w) / 2;
      let finalY = y !== undefined ? y - (h / 2) : (100 - h) / 2;

      const newFrame: Frame = {
        id: `f-${Math.random().toString(36).substr(2, 9)}`,
        imageId: null,
        x: finalX,
        y: finalY,
        width: w, height: h, zIndex: maxZ + 1, cropType: 'fill', scale: 1, offset: { x: 50, y: 50 }, isLocked: true
      };
      page.frames = [...page.frames, newFrame];
      next[pageIdx] = page;
      setActiveFrame({ pageIndex: pageIdx, frameId: newFrame.id });
      return next;
    });
  }, [saveToHistory, currentRatio]);

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
    if (activeFrame?.frameId === frameId) setActiveFrame(null);
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
        imageId: null,
        x: source.x + 2,
        y: source.y + 2,
        zIndex: maxZ + 1
      };
      page.frames = [...page.frames, newFrame];
      next[pageIdx] = page;
      setActiveFrame({ pageIndex: pageIdx, frameId: newFrame.id });
      return next;
    });
  }, [saveToHistory]);

  const onToggleSpread = useCallback((pageIdx: number, frameId: string) => {
    saveToHistory();
    setPageConfigs(prev => {
       const next = JSON.parse(JSON.stringify(prev));
       const isLeft = pageIdx % 2 === 0;
       
       if (isLeft) {
          const page = next[pageIdx];
          const frame = page.frames.find((f: Frame) => f.id === frameId);
          if (frame) {
             frame.isSpread = !frame.isSpread;
             if (frame.isSpread) {
                 frame.width = 200; 
                 frame.x = 0; 
             } else {
                 frame.width = 50;
                 if (frame.x + frame.width > 100) frame.x = 100 - frame.width;
             }
          }
       } else {
          // Move from right page to left
          const rightPage = next[pageIdx];
          const leftPageIdx = pageIdx - 1;
          if (leftPageIdx >= 0) {
             const leftPage = next[leftPageIdx];
             const frameIndex = rightPage.frames.findIndex((f: Frame) => f.id === frameId);
             if (frameIndex !== -1) {
                const [frame] = rightPage.frames.splice(frameIndex, 1);
                frame.isSpread = true;
                frame.width = 200;
                frame.x = 0; 
                frame.y = Math.max(0, frame.y);
                const maxZ = leftPage.frames.length > 0 ? Math.max(...leftPage.frames.map((f:any) => f.zIndex)) : 0;
                frame.zIndex = maxZ + 1;
                leftPage.frames.push(frame);
             }
          }
       }
       return next;
    });
    setActiveFrame(null);
  }, [saveToHistory]);

  const onDropImage = useCallback((pageIdx: number, frameId: string | null, imageId: string, x?: number, y?: number) => {
    saveToHistory();
    const image = images.find(i => i.id === imageId);
    if (frameId) {
      const updates: Partial<Frame> = { imageId, isLocked: true }; 
      onUpdateFrame(pageIdx, frameId, updates);
      setActiveFrame({ pageIndex: pageIdx, frameId });
    } else {
      setPageConfigs(prev => {
        const next = [...prev];
        const page = { ...next[pageIdx] };
        const maxZ = page.frames.length > 0 ? Math.max(...page.frames.map(f => f.zIndex)) : 0;
        const imgRatio = image ? (image.aspectRatio || 1) : 1;
        const pageRatio = currentRatio;
        
        let w = 40;
        let h = w * (pageRatio / imgRatio);
        if (h > 60) { h = 60; w = h * (imgRatio / pageRatio); }
        
        const dropX = x !== undefined ? x : 50;
        const dropY = y !== undefined ? y : 50;
        
        const newFrame: Frame = {
          id: `f-${Math.random().toString(36).substr(2, 9)}`, imageId: imageId,
          x: dropX - w/2, 
          y: dropY - h/2,
          width: w, height: h, zIndex: maxZ + 1, cropType: 'fill', scale: 1, offset: { x: 50, y: 50 }, isLocked: true
        };
        page.frames = [...page.frames, newFrame];
        next[pageIdx] = page;
        setActiveFrame({ pageIndex: pageIdx, frameId: newFrame.id });
        return next;
      });
    }
  }, [onUpdateFrame, saveToHistory, images, currentRatio, pageConfigs]);

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
    
    if (settings.format === 'pdf') {
       setExportStatus('Initializing PDF Engine...');
       setExportProgress(5);
       await new Promise(r => setTimeout(r, 200));

       let singlePageWidth = 10;
       let singlePageHeight = 10;
       
       if (dimension === '1:1') { singlePageWidth=10; singlePageHeight=10; }
       else if (dimension === '2:3') { singlePageWidth=8; singlePageHeight=12; }
       else if (dimension === '3:2') { singlePageWidth=12; singlePageHeight=8; }
       else if (dimension === '4:5') { singlePageWidth=8; singlePageHeight=10; }
       else if (dimension === '5:4') { singlePageWidth=10; singlePageHeight=8; }
       else if (dimension === 'A4_Landscape') { singlePageWidth=11.69; singlePageHeight=8.27; }
       else if (dimension === 'A4_Portrait') { singlePageWidth=8.27; singlePageHeight=11.69; }
       else if (dimension === 'Custom') { singlePageHeight=10; singlePageWidth=10*currentRatio; }

       const isSpreads = settings.scope === 'spreads';
       const docWidth = isSpreads ? singlePageWidth * 2 : singlePageWidth;
       const docHeight = singlePageHeight;

       const doc = new jsPDF({
           orientation: docWidth > docHeight ? 'landscape' : 'portrait',
           unit: 'in',
           format: [docWidth, docHeight]
       });

       const processFrame = async (frame: Frame, pageOffset: number) => {
           if (frame.imageId) {
               const img = images.find(img => img.id === frame.imageId);
               if (img) {
                   try {
                       const base64 = await getBase64FromUrl(img.url);
                       const x = pageOffset + ((frame.x / 100) * singlePageWidth);
                       const y = (frame.y / 100) * singlePageHeight;
                       const w = (frame.width / 100) * singlePageWidth;
                       const h = (frame.height / 100) * singlePageHeight;
                       
                       doc.addImage(base64, 'JPEG', x, y, w, h);
                   } catch (e) {
                       console.error('Failed to load image for PDF', e);
                   }
               }
           }
       };

       if (isSpreads) {
           for (let i = 0; i < pageConfigs.length; i += 2) {
               if (i > 0) doc.addPage([docWidth, docHeight]);
               
               const leftPage = pageConfigs[i];
               setExportStatus(`Rendering Spread ${Math.floor(i / 2) + 1} (Left Page)...`);
               setExportProgress(10 + ((i / pageConfigs.length) * 80));
               await new Promise(r => setTimeout(r, 50));

               for (const frame of leftPage.frames) {
                   await processFrame(frame, 0); 
               }

               if (i + 1 < pageConfigs.length) {
                   const rightPage = pageConfigs[i + 1];
                   setExportStatus(`Rendering Spread ${Math.floor(i / 2) + 1} (Right Page)...`);
                   await new Promise(r => setTimeout(r, 50));

                   for (const frame of rightPage.frames) {
                        await processFrame(frame, singlePageWidth); 
                   }
               }
           }
       } else {
           for (let i = 0; i < pageConfigs.length; i++) {
               if (i > 0) doc.addPage([docWidth, docHeight]);
               
               const page = pageConfigs[i];
               setExportStatus(`Rendering Page ${i + 1}...`);
               setExportProgress(10 + ((i / pageConfigs.length) * 80));
               await new Promise(r => setTimeout(r, 50));

               for (const frame of page.frames) {
                   await processFrame(frame, 0); 
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
    
    const totalPages = pageConfigs.length;
    const isComplex = settings.format === 'idml' || settings.format === 'psd';
    await new Promise(r => setTimeout(r, 600));
    setExportStatus('Analyzing Document Structure...');
    setExportProgress(15);

    for(let i=0; i<totalPages; i++) {
        const percent = 15 + ((i+1) / totalPages) * 40;
        setExportStatus(`Rasterizing High-Res Assets for Page ${i+1}...`);
        setExportProgress(percent);
        await new Promise(r => setTimeout(r, isComplex ? 300 : 100));
    }

    setExportStatus(settings.format === 'idml' ? 'Generating XML Geometry...' : settings.format === 'psd' ? 'Flattening Layers...' : 'Applying Color Profile...');
    await new Promise(r => setTimeout(r, 800));
    setExportProgress(80);

    if (settings.colorProfile === 'cmyk') {
        setExportStatus('Converting to CMYK (SWOP 2006)...');
        await new Promise(r => setTimeout(r, 1000));
    }
    setExportStatus('Finalizing Package...');
    setExportProgress(95);
    await new Promise(r => setTimeout(r, 600));
    setExportProgress(100);

    const manifest = `PROJECT EXPORT MANIFEST\nFilename: ${sanitizedFilename}\nFormat: ${settings.format.toUpperCase()}\nScope: ${settings.scope.toUpperCase()}\nResolution: ${settings.dpi} DPI\nTimestamp: ${new Date().toISOString()}\nPages: ${totalPages}`;
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
      let finalTargetIdx = targetIdx;
      if (draggedIdx < targetIdx) finalTargetIdx--;
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileList = Array.from(files).filter((file) => (file as File).type.startsWith('image/')) as File[];
      const newPhotos = await Promise.all(fileList.map(async (file) => {
         const url = URL.createObjectURL(file);
         const aspect = await new Promise<number>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img.width / img.height);
            img.onerror = () => resolve(1);
            img.src = url;
         });
         return {
            id: Math.random().toString(36).substr(2, 9),
            url,
            name: file.name,
            aspectRatio: aspect
         };
      }));
      setImages(prev => [...prev, ...newPhotos]);
    }
    e.target.value = '';
  };

  const autoPopulate = () => {
    const selectedImages = images.filter(img => selectedLibraryImageIds.includes(img.id));
    if (selectedImages.length === 0) return;
    saveToHistory();
    setPageConfigs(prev => {
      const nextConfigs = JSON.parse(JSON.stringify(prev));
      let imageIndex = 0;
      nextConfigs.forEach((page: PageConfig) => {
        page.frames.forEach((frame: Frame) => {
          if (!frame.imageId && imageIndex < selectedImages.length) {
            const img = selectedImages[imageIndex];
            frame.imageId = img.id;
            const imgRatio = img.aspectRatio || 1;
            const pageRatio = currentRatio;
            let newH = frame.width * (pageRatio / imgRatio);
            if (newH > 80) {
                newH = 80;
                frame.width = newH * (imgRatio / pageRatio);
            }
            frame.height = newH;
            if (frame.y + frame.height > 100) {
                frame.y = Math.max(0, 100 - frame.height);
            }
            imageIndex++;
          }
        });
      });
      while (imageIndex < selectedImages.length) {
         const p1Id = `p${nextConfigs.length + 1}-${Date.now()}`;
         const p2Id = `p${nextConfigs.length + 2}-${Date.now()}`;
         const page1 = createInitialPageConfig(p1Id, globalBleedValue);
         const page2 = createInitialPageConfig(p2Id, globalBleedValue);
         if (imageIndex < selectedImages.length) {
             const img = selectedImages[imageIndex];
             page1.frames[0].imageId = img.id;
             const imgRatio = img.aspectRatio || 1;
             const pageRatio = currentRatio;
             page1.frames[0].height = page1.frames[0].width * (pageRatio / imgRatio);
             imageIndex++;
         }
         if (imageIndex < selectedImages.length) {
             const img = selectedImages[imageIndex];
             page2.frames[0].imageId = img.id;
             const imgRatio = img.aspectRatio || 1;
             const pageRatio = currentRatio;
             page2.frames[0].height = page2.frames[0].width * (pageRatio / imgRatio);
             imageIndex++;
         }
         nextConfigs.push(page1, page2);
      }
      return nextConfigs;
    });
    setSelectedLibraryImageIds([]);
  };

  const handleLibraryItemClick = (id: string) => {
    setSelectedLibraryImageIds(prev => {
      if (prev.includes(id)) return prev.filter(item => item !== id);
      return [...prev, id];
    });
  };

  const toggleSelectAll = () => {
    if (selectedLibraryImageIds.length === images.length) setSelectedLibraryImageIds([]);
    else setSelectedLibraryImageIds(images.map(img => img.id));
  };

  const handleVoidClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setActiveFrame(null);
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

      {showDimensionModal && (
        <CustomDimensionModal 
          onClose={cancelCustomDimensions}
          onApply={applyCustomDimensions}
          currentRatio={currentRatio}
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
              onMouseUp={saveToHistory} 
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
                  onClick={() => setShowDimensionModal(true)}
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
        <aside 
            className="bg-[#0d0d0d] border-r border-[#1a1a1a] flex flex-col z-20 overflow-hidden shrink-0 transition-all duration-300" 
            style={{ width: isSidebarCollapsed ? 60 : sidebarWidth }}
        >
          <div className={`p-4 border-b border-[#1a1a1a] flex items-center shrink-0 h-14 ${isSidebarCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>
            {!isSidebarCollapsed && (
                <>
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Library ({images.length})</h2>
                <div className="flex items-center gap-2">
                    <button onClick={toggleSelectAll} className="text-[9px] text-blue-500 font-bold hover:text-blue-400">
                        {selectedLibraryImageIds.length === images.length ? 'None' : 'All'}
                    </button>
                    <Tooltip text="Upload new photos" position="right">
                        <button onClick={() => document.getElementById('file-up')?.click()} className="w-7 h-7 flex items-center justify-center bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                        </button>
                    </Tooltip>
                    <button onClick={() => setIsSidebarCollapsed(true)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
                    </button>
                </div>
                </>
            )}
            {isSidebarCollapsed && (
                <button onClick={() => setIsSidebarCollapsed(false)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#222] rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                </button>
            )}
            <input id="file-up" type="file" multiple className="hidden" onChange={handleFileUpload} />
          </div>
          
          {isSidebarCollapsed ? (
             <div className="flex-1 flex flex-col items-center py-6 gap-6">
                <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest vertical-text" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    Library Content
                </div>
                <div className="w-8 h-px bg-[#333]"></div>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-xl font-black text-white">{images.length}</span>
                    <span className="text-[7px] font-bold text-slate-500 uppercase">Items</span>
                </div>
                <Tooltip text="Upload" position="right">
                    <button onClick={() => document.getElementById('file-up')?.click()} className="w-8 h-8 flex items-center justify-center bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg transition-all mt-4">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                    </button>
                </Tooltip>
             </div>
          ) : (
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
          )}
        </aside>

        {!isSidebarCollapsed && (
            <div 
            className="w-1.5 h-full cursor-col-resize hover:bg-blue-600/50 transition-colors z-[35] shrink-0 bg-transparent"
            onMouseDown={() => setIsResizingSidebar(true)}
            />
        )}

        <main 
          className="flex-1 overflow-y-auto bg-[#080808] hide-scrollbar scroll-smooth"
          onMouseDown={handleVoidClick}
        >
          <div 
            className="py-24 px-12 flex flex-wrap justify-center gap-x-24 gap-y-48 min-h-full content-start"
            onMouseDown={handleVoidClick}
          >
            {spreads.map((spread, sIdx) => {
              const leftPageHasSpread = pageConfigs[spread.leftIdx].frames.some(f => f.isSpread);
              const rightFrames = spread.rightIdx !== null ? pageConfigs[spread.rightIdx].frames : [];
              const leftFrames = pageConfigs[spread.leftIdx].frames;
              
              // Boost Z-index if context menu is active on this page
              const leftZIndex = activeMenuPageIndex === spread.leftIdx ? 100 : (leftPageHasSpread ? 20 : 1);
              const rightZIndex = activeMenuPageIndex === spread.rightIdx ? 100 : 1;

              return (
                <div key={sIdx} className="relative group shrink-0">
                  <div className="absolute -top-10 left-0 right-0 flex justify-between px-2 opacity-30 group-hover:opacity-100 transition-opacity">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Spread {sIdx + 1}</span>
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pages {spread.leftIdx + 1} & {spread.rightIdx !== null ? spread.rightIdx + 1 : ''}</span>
                  </div>

                  <div className="flex bg-white shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)] rounded-[1px] overflow-visible">
                     <div className="relative group/page" style={{ zIndex: leftZIndex }}>
                        <Page 
                          pageIndex={spread.leftIdx} config={pageConfigs[spread.leftIdx]} 
                          activeFrameId={activeFrame?.pageIndex === spread.leftIdx ? activeFrame.frameId : null}
                          onSetActiveFrameId={(id) => setActiveFrame(id ? { pageIndex: spread.leftIdx, frameId: id } : null)}
                          libraryImages={images} ratio={currentRatio} width={dynamicPageWidth}
                          onDropImage={onDropImage} onUpdateFrame={onUpdateFrame} onDeleteFrame={onDeleteFrame} 
                          onDuplicateFrame={onDuplicateFrame} onAddFrame={onAddFrame} onClearPage={onClearPage}
                          onInteractionStart={saveToHistory}
                          onToggleSpread={onToggleSpread}
                          neighborFrames={rightFrames}
                          onContextMenuOpen={(isOpen) => setActiveMenuPageIndex(isOpen ? spread.leftIdx : null)}
                        />
                        <PageActionBar 
                          index={spread.leftIdx} config={pageConfigs[spread.leftIdx]} 
                          zoomLevel={zoomLevel} width={dynamicPageWidth}
                          onAddFrame={onAddFrame} updatePageMargin={updatePageMargin}
                        />
                     </div>

                     {spread.rightIdx !== null && (
                       <div className="relative group/page" style={{ zIndex: rightZIndex }}>
                          <Page 
                            pageIndex={spread.rightIdx} config={pageConfigs[spread.rightIdx]} 
                            activeFrameId={activeFrame?.pageIndex === spread.rightIdx ? activeFrame.frameId : null}
                            onSetActiveFrameId={(id) => setActiveFrame(id ? { pageIndex: spread.rightIdx, frameId: id } : null)}
                            libraryImages={images} ratio={currentRatio} width={dynamicPageWidth}
                            isRightPage onDropImage={onDropImage} onUpdateFrame={onUpdateFrame} onDeleteFrame={onDeleteFrame} 
                            onDuplicateFrame={onDuplicateFrame} onAddFrame={onAddFrame} onClearPage={onClearPage}
                            onInteractionStart={saveToHistory}
                            onToggleSpread={onToggleSpread}
                            neighborFrames={leftFrames}
                            onContextMenuOpen={(isOpen) => setActiveMenuPageIndex(isOpen ? spread.rightIdx : null)}
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
              );
            })}

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
