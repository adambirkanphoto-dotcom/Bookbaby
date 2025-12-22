
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { PhotoImage, SpreadDimension, PageLayout, PageConfig } from './types';
import { DIMENSION_RATIOS, DIMENSION_LABELS, INITIAL_IMAGES } from './constants';
import { LibraryItem } from './components/LibraryItem';
import { Page } from './components/Page';

interface PageActionBarProps {
  index: number;
  config: PageConfig;
  zoomLevel: number;
  width: number;
  updatePageLayout: (index: number, layout: PageLayout) => void;
  updatePageCrop: (index: number, crop: 'fill' | 'fit') => void;
  updatePageMargin: (index: number, margin: number) => void;
  onDeletePage: (index: number) => void;
}

const PageActionBar: React.FC<PageActionBarProps> = ({ 
  index, 
  config, 
  zoomLevel, 
  width,
  updatePageLayout, 
  updatePageCrop, 
  updatePageMargin,
  onDeletePage
}) => {
  const [showBleedSlider, setShowBleedSlider] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowBleedSlider(false);
      }
    };
    if (showBleedSlider) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBleedSlider]);

  const isCompact = width < 260;
  const isSuperCompact = width < 180;

  return (
    <div className={`absolute -bottom-14 left-0 w-full flex items-center justify-between gap-1 px-2 py-2 bg-[#1a1a1a] border-t border-[#333] rounded-b shadow-2xl transition-all border-x border-b ${zoomLevel < 0.4 ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100'} group-hover/page:border-blue-900/50 group-hover:opacity-100 z-20`}>
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <div className="flex items-center bg-[#2d2d2d] rounded p-0.5 border border-[#3d3d3d] shrink-0">
          {(['single', 'double', 'grid-4'] as PageLayout[]).map((l) => (
            <button
              key={l}
              onClick={() => updatePageLayout(index, l)}
              className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all ${config.layout === l ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              title={l}
            >
              {isSuperCompact ? l.charAt(0) : (l === 'grid-4' ? 'Grid' : l)}
            </button>
          ))}
        </div>

        <div className="relative shrink-0" ref={containerRef}>
          <button 
            onClick={() => setShowBleedSlider(!showBleedSlider)}
            className={`px-2 py-1 rounded border border-[#3d3d3d] text-[8px] font-black uppercase transition-all ${config.margin > 0 ? 'bg-blue-900/40 text-blue-400' : 'text-slate-500 hover:text-slate-400'}`}
          >
            {isCompact ? 'B' : 'Bleed'}: {config.margin}"
          </button>
          {showBleedSlider && (
            <div className="absolute bottom-full mb-2 left-0 bg-[#2d2d2d] border border-[#444] p-3 rounded shadow-2xl flex flex-col gap-2 min-w-[120px] z-50">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black text-slate-400 uppercase">Bleed</span>
                <span className="text-[8px] font-black text-blue-400">{config.margin}"</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="10" 
                step="0.5" 
                value={config.margin} 
                onChange={(e) => updatePageMargin(index, parseFloat(e.target.value))}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full h-1 bg-[#444] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button 
          onClick={() => updatePageCrop(index, config.cropType === 'fill' ? 'fit' : 'fill')}
          className={`px-2 py-1 rounded border border-[#3d3d3d] text-[8px] font-black uppercase transition-all ${config.cropType === 'fill' ? 'bg-[#333] text-blue-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          {isCompact ? config.cropType.charAt(0) : config.cropType}
        </button>
        <button 
          onClick={() => onDeletePage(index)}
          className="p-1 rounded bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white transition-all border border-red-900/40"
          title="Delete Page"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [images, setImages] = useState<PhotoImage[]>(INITIAL_IMAGES);
  const [dimension, setDimension] = useState<SpreadDimension>('8x8');
  const [customWidth, setCustomWidth] = useState(10);
  const [customHeight, setCustomHeight] = useState(10);
  const [pageConfigs, setPageConfigs] = useState<PageConfig[]>([]);
  const [placedStatus, setPlacedStatus] = useState<Record<string, boolean>>({});
  const [imageScales, setImageScales] = useState<Record<string, number>>({});
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [showGlobalBleed, setShowGlobalBleed] = useState(false);
  const [globalBleedValue, setGlobalBleedValue] = useState(1);
  
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportQuality, setExportQuality] = useState<'Draft' | 'Standard' | 'Print'>('Standard');
  const [exportFormat, setExportFormat] = useState<'JPG' | 'PDF'>('JPG');
  const [isExporting, setIsExporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const globalBleedRef = useRef<HTMLDivElement>(null);

  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizing = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
      if (globalBleedRef.current && !globalBleedRef.current.contains(e.target as Node)) {
        setShowGlobalBleed(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const startResizing = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = Math.max(180, Math.min(window.innerWidth * 0.5, e.clientX));
    setSidebarWidth(newWidth);
  }, []);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentRatio = useMemo(() => {
    if (dimension === 'Custom') return customWidth / customHeight;
    return DIMENSION_RATIOS[dimension] || 1;
  }, [dimension, customWidth, customHeight]);

  const dynamicPageWidth = useMemo(() => {
    const horizontalPadding = 200;
    const verticalPadding = 250;
    const workspaceWidth = (windowWidth - sidebarWidth - horizontalPadding) / 2;
    const workspaceHeight = windowHeight - verticalPadding;
    let width = workspaceWidth * zoomLevel;
    const height = width / currentRatio;
    if (height > workspaceHeight * zoomLevel) {
      width = (workspaceHeight * zoomLevel) * currentRatio;
    }
    return Math.max(100, width);
  }, [windowWidth, windowHeight, sidebarWidth, zoomLevel, currentRatio]);

  const isSingleColumn = sidebarWidth < 280;
  const [libraryDropTarget, setLibraryDropTarget] = useState<{ index: number, side: 'left' | 'right' | 'top' | 'bottom' } | null>(null);

  useEffect(() => {
    if (pageConfigs.length > 0 || images.length === 0) return;
    const initialPages: PageConfig[] = [];
    let count = 0;
    while (count < Math.max(images.length, 2) || initialPages.length % 2 !== 0) {
      initialPages.push({ 
        id: `p-${initialPages.length}-${Date.now()}`, 
        layout: 'single', 
        cropType: 'fit',
        margin: globalBleedValue 
      });
      count += 1;
    }
    setPageConfigs(initialPages);
  }, [images.length, globalBleedValue, pageConfigs.length]);

  const getGlobalIndex = useCallback((pageIndex: number, slotIndex: number) => {
    let globalIndex = 0;
    for (let i = 0; i < pageIndex; i++) {
      const config = pageConfigs[i];
      if (!config) continue;
      globalIndex += (config.layout === 'grid-4' ? 4 : config.layout === 'double' ? 2 : 1);
    }
    return globalIndex + slotIndex;
  }, [pageConfigs]);

  const handleLibraryDragStart = useCallback((e: React.DragEvent, index: number) => {
    const image = images[index];
    if (!image) return;
    e.dataTransfer.setData('sourceType', 'library');
    e.dataTransfer.setData('imageIndex', index.toString());
    e.dataTransfer.setData('imageId', image.id);
    e.dataTransfer.effectAllowed = 'move';
  }, [images]);

  const handleSpreadDragStart = useCallback((e: React.DragEvent, pageIndex: number, slotIndex: number) => {
    const globalIdx = getGlobalIndex(pageIndex, slotIndex);
    if (globalIdx >= images.length) return;
    const image = images[globalIdx];
    if (!image || !placedStatus[image.id]) return;
    e.dataTransfer.setData('sourceType', 'spread');
    e.dataTransfer.setData('imageIndex', globalIdx.toString());
    e.dataTransfer.setData('imageId', image.id);
    e.dataTransfer.effectAllowed = 'move';
  }, [images, placedStatus, getGlobalIndex]);

  const handleLibraryDragOver = useCallback((e: React.DragEvent, index: number, side: 'left' | 'right' | 'top' | 'bottom') => {
    e.preventDefault();
    setLibraryDropTarget(prev => {
      if (prev?.index === index && prev?.side === side) return prev;
      return { index, side };
    });
  }, []);

  const handleLibraryDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    const dropInfo = libraryDropTarget;
    setLibraryDropTarget(null);
    const sourceIdx = parseInt(e.dataTransfer.getData('imageIndex'));
    if (isNaN(sourceIdx) || !dropInfo) return;
    const newImages = [...images];
    const item = newImages.splice(sourceIdx, 1)[0];
    if (!item) return;
    let targetIdx = dropInfo.index;
    if (dropInfo.side === 'right' || dropInfo.side === 'bottom') targetIdx += 1;
    if (sourceIdx < targetIdx) targetIdx -= 1;
    newImages.splice(Math.max(0, targetIdx), 0, item);
    setImages(newImages);
  }, [images, libraryDropTarget]);

  const handleDropOnPage = useCallback((targetPageIndex: number, targetSlotIndex: number) => {
    const sourceIdxStr = window.event?.['dataTransfer']?.getData('imageIndex');
    const imageId = window.event?.['dataTransfer']?.getData('imageId');
    if (!sourceIdxStr || !imageId) return;
    let targetImageIndex = getGlobalIndex(targetPageIndex, targetSlotIndex);
    if (targetImageIndex >= images.length) return;
    const newImages = [...images];
    const sourceImageIdx = newImages.findIndex(img => img.id === imageId);
    if (sourceImageIdx !== -1) {
      const temp = newImages[targetImageIndex];
      newImages[targetImageIndex] = newImages[sourceImageIdx];
      newImages[sourceImageIdx] = temp;
      setImages(newImages);
      setPlacedStatus(prev => ({ ...prev, [imageId]: true }));
    }
  }, [images, getGlobalIndex]);

  const handleRemoveImageFromPage = useCallback((imageId: string) => {
    setPlacedStatus(prev => ({ ...prev, [imageId]: false }));
  }, []);

  const handleRemoveImageFromLibrary = useCallback((imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
    setPlacedStatus(prev => {
      const next = { ...prev };
      delete next[imageId];
      return next;
    });
    setImageScales(prev => {
      const next = { ...prev };
      delete next[imageId];
      return next;
    });
  }, []);

  const handleScaleChange = useCallback((imageId: string, scale: number) => {
    setImageScales(prev => ({ ...prev, [imageId]: scale }));
  }, []);

  const populateAll = useCallback(() => {
    if (images.length === 0) return;
    const newStatus: Record<string, boolean> = {};
    images.forEach(img => { newStatus[img.id] = true; });
    setPlacedStatus(newStatus);

    setPageConfigs(prev => {
      let currentCapacity = 0;
      prev.forEach(p => {
        currentCapacity += (p.layout === 'grid-4' ? 4 : p.layout === 'double' ? 2 : 1);
      });
      if (currentCapacity >= images.length) return prev;
      const next = [...prev];
      let newCapacity = currentCapacity;
      while (newCapacity < images.length || next.length % 2 !== 0) {
        next.push({ 
          id: `p-${next.length}-${Date.now()}`, 
          layout: 'single', 
          cropType: 'fit',
          margin: globalBleedValue 
        });
        newCapacity += 1;
      }
      return next;
    });
  }, [images, globalBleedValue]);

  const clearSpread = useCallback(() => {
    setPlacedStatus({});
    setImageScales({});
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos: PhotoImage[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file),
      name: file.name,
      aspectRatio: 1
    }));
    setImages(prev => [...prev, ...newPhotos]);
  };

  const updatePageLayout = useCallback((index: number, layout: PageLayout) => {
    setPageConfigs(prev => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], layout };
      return next;
    });
  }, []);

  const updatePageCrop = useCallback((index: number, crop: 'fill' | 'fit') => {
    setPageConfigs(prev => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], cropType: crop };
      return next;
    });
  }, []);

  const updatePageMargin = useCallback((index: number, margin: number) => {
    setPageConfigs(prev => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], margin };
      return next;
    });
  }, []);

  const updateAllMargins = (margin: number) => {
    setGlobalBleedValue(margin);
    setPageConfigs(prev => prev.map(config => ({ ...config, margin })));
  };

  const addSpread = () => {
    setPageConfigs(prev => [
      ...prev,
      { id: `p${prev.length + 1}-${Date.now()}`, layout: 'single', cropType: 'fit', margin: globalBleedValue },
      { id: `p${prev.length + 2}-${Date.now()}`, layout: 'single', cropType: 'fit', margin: globalBleedValue },
    ]);
  };

  const deletePage = (index: number) => {
    setPageConfigs(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length % 2 !== 0) {
        next.push({ 
          id: `p-fill-${Date.now()}`, 
          layout: 'single', 
          cropType: 'fit', 
          margin: globalBleedValue 
        });
      }
      return next;
    });
  };

  const removeSpreadAt = (leftIdx: number) => {
    setPageConfigs(prev => prev.filter((_, i) => i !== leftIdx && i !== leftIdx + 1));
  };

  const toBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function() {
        const reader = new FileReader();
        reader.onloadend = function() {
          resolve(reader.result as string);
        }
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = reject;
      xhr.open('GET', url);
      xhr.responseType = 'blob';
      xhr.send();
    });
  };

  const performExport = useCallback(async () => {
    setIsExporting(true);
    const fileName = `bookbaby-complete-export-${new Date().getTime()}`;
    const targetDPI = exportQuality === 'Draft' ? 72 : exportQuality === 'Standard' ? 150 : 300;
    const scaleFactor = targetDPI / 96;

    // Prefetch all images as Base64 to ensure they are embedded properly (no external blob refs)
    const imageCache: Record<string, string> = {};
    for (const img of images) {
      if (placedStatus[img.id]) {
        try {
          imageCache[img.id] = await toBase64(img.url);
        } catch (e) {
          console.error(`Failed to embed image ${img.name}`, e);
          imageCache[img.id] = img.url; // Fallback
        }
      }
    }

    if (exportFormat === 'JPG') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const pageWidth = 800 * scaleFactor;
      const pageHeight = (800 / currentRatio) * scaleFactor;
      const numSpreads = Math.ceil(pageConfigs.length / 2);
      
      canvas.width = pageWidth * 2;
      canvas.height = pageHeight * numSpreads;

      const renderPageOnCanvas = async (pIdx: number, offsetX: number, offsetY: number) => {
        const config = pageConfigs[pIdx];
        if (!config) return;
        
        ctx.fillStyle = 'white';
        ctx.fillRect(offsetX, offsetY, pageWidth, pageHeight);

        const padding = (config.margin / 16) * pageWidth;
        const slotsCount = config.layout === 'grid-4' ? 4 : config.layout === 'double' ? 2 : 1;
        
        let cursor = 0;
        for (let i = 0; i < pIdx; i++) {
          const c = pageConfigs[i];
          cursor += c.layout === 'grid-4' ? 4 : c.layout === 'double' ? 2 : 1;
        }

        const slotW = config.layout === 'single' ? pageWidth - padding * 2 : (pageWidth - padding * 3) / 2;
        const slotH = config.layout === 'grid-4' ? (pageHeight - padding * 3) / 2 : pageHeight - padding * 2;

        for (let s = 0; s < slotsCount; s++) {
          const imgData = images[cursor + s];
          if (imgData && placedStatus[imgData.id]) {
            const x = offsetX + padding + (s % 2) * (slotW + padding);
            const y = offsetY + padding + (s > 1 ? slotH + padding : 0);
            
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, slotW, slotH);
            ctx.clip();

            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageCache[imgData.id] || imgData.url;
            await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });

            const scale = imageScales[imgData.id] || 1;
            const drawW = config.cropType === 'fill' ? Math.max(slotW, slotH * (img.width / img.height)) * scale : Math.min(slotW, slotH * (img.width / img.height)) * scale;
            const drawH = drawW * (img.height / img.width);
            
            ctx.drawImage(img, x + (slotW - drawW) / 2, y + (slotH - drawH) / 2, drawW, drawH);
            ctx.restore();
          }
        }
      };

      for (let sIdx = 0; sIdx < numSpreads; sIdx++) {
        const leftIdx = sIdx * 2;
        const rightIdx = leftIdx + 1;
        const offsetY = sIdx * pageHeight;
        
        await renderPageOnCanvas(leftIdx, 0, offsetY);
        if (rightIdx < pageConfigs.length) {
          await renderPageOnCanvas(rightIdx, pageWidth, offsetY);
        }
      }

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${fileName}.jpg`;
          link.click();
        }
        setIsExporting(false);
        setShowExportMenu(false);
      }, 'image/jpeg', 0.95);

    } else {
      // PDF Export via PORTABLE HTML (Base64 Images)
      let html = `<!DOCTYPE html><html><head><title>${fileName}</title><style>
        @page { size: auto; margin: 0; }
        body { margin: 0; background: #eee; font-family: system-ui; }
        .spread { display: flex; width: 100vw; height: ${100 / currentRatio}vw; background: white; page-break-after: always; position: relative; }
        .page { flex: 1; position: relative; border: 1px solid #f0f0f0; box-sizing: border-box; display: flex; align-items: stretch; }
        .grid { display: grid; width: 100%; height: 100%; gap: 10px; padding: 20px; box-sizing: border-box; }
        .slot { background: #fafafa; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; border: 1px solid #eee; }
        img { width: 100%; height: 100%; object-fit: cover; }
        .fit { object-fit: contain; }
        .meta { position: absolute; bottom: 5px; right: 5px; font-size: 8px; color: #ccc; }
        @media print { body { background: white; } .meta { display: none; } }
      </style></head><body>`;

      let imgCursor = 0;
      for (let i = 0; i < pageConfigs.length; i += 2) {
        html += `<div class="spread">`;
        
        const renderHtmlPage = (pIdx: number) => {
          const config = pageConfigs[pIdx];
          const slots = config.layout === 'grid-4' ? 4 : config.layout === 'double' ? 2 : 1;
          const gridStyle = config.layout === 'grid-4' ? 'grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;' : 
                            config.layout === 'double' ? 'grid-template-columns: 1fr 1fr;' : 'grid-template-columns: 1fr;';
          
          let pageHtml = `<div class="page"><div class="grid" style="${gridStyle}; padding: ${config.margin * 5}px">`;
          for (let s = 0; s < slots; s++) {
            const img = images[imgCursor + s];
            if (img && placedStatus[img.id]) {
              const scale = imageScales[img.id] || 1;
              const base64Src = imageCache[img.id] || img.url;
              pageHtml += `<div class="slot"><img src="${base64Src}" class="${config.cropType}" style="transform: scale(${scale})"></div>`;
            } else {
              pageHtml += `<div class="slot" style="background: #f0f0f0"></div>`;
            }
          }
          pageHtml += `</div><div class="meta">P.${pIdx + 1}</div></div>`;
          imgCursor += slots;
          return pageHtml;
        };

        html += renderHtmlPage(i);
        if (i + 1 < pageConfigs.length) html += renderHtmlPage(i + 1);
        html += `</div>`;
      }
      
      html += `<script>window.onload = () => { setTimeout(() => { window.print(); }, 1000); }</script></body></html>`;
      
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}-portable.html`;
      link.click();
      
      setIsExporting(false);
      setShowExportMenu(false);
    }
  }, [dimension, pageConfigs, images, placedStatus, imageScales, exportFormat, exportQuality, currentRatio]);

  const paginatedImages = useMemo(() => {
    let currentIdx = 0;
    return pageConfigs.map(config => {
      if (!config) return [];
      const count = config.layout === 'grid-4' ? 4 : config.layout === 'double' ? 2 : 1;
      const slice = images.slice(currentIdx, currentIdx + count).map(img => 
        img && placedStatus[img.id] ? img : null
      );
      currentIdx += count;
      return slice as (PhotoImage | null)[];
    });
  }, [images, pageConfigs, placedStatus]);

  const spreads = useMemo(() => {
    const s = [];
    for (let i = 0; i < pageConfigs.length; i += 2) {
      s.push({ leftIdx: i, rightIdx: i + 1 < pageConfigs.length ? i + 1 : null });
    }
    return s;
  }, [pageConfigs]);

  const getDropIndicator = (idx: number) => {
    if (!libraryDropTarget || libraryDropTarget.index !== idx) return null;
    const { side } = libraryDropTarget;
    const baseClass = "absolute bg-blue-500 z-30 shadow-[0_0_8px_rgba(59,130,246,0.8)] pointer-events-none rounded-full transition-all duration-75";
    if (side === 'left') return <div className={`${baseClass} left-[-6px] top-0 bottom-0 w-[4px]`} />;
    if (side === 'right') return <div className={`${baseClass} right-[-6px] top-0 bottom-0 w-[4px]`} />;
    if (side === 'top') return <div className={`${baseClass} top-[-6px] left-0 right-0 h-[4px]`} />;
    if (side === 'bottom') return <div className={`${baseClass} bottom-[-6px] left-0 right-0 h-[4px]`} />;
    return null;
  };

  return (
    <div className="flex flex-col h-screen text-slate-900 overflow-hidden select-none bg-[#121212]">
      <header className="h-14 border-b bg-[#1e1e1e] border-[#333] px-6 flex items-center justify-between z-40 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center text-white font-black text-xs shadow-lg">B</div>
          <h1 className="text-sm font-bold tracking-tight text-slate-100 uppercase">BookBaby</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-[#2d2d2d] border border-[#444] px-4 py-1.5 rounded-full shadow-inner">
            <input 
              type="range" min="0.2" max="2.0" step="0.05" value={zoomLevel} 
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="w-24 h-1 bg-[#444] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-[10px] font-black text-slate-300 min-w-[32px] text-center">{Math.round(zoomLevel * 100)}%</span>
          </div>

          <div className="flex items-center gap-2 bg-[#2d2d2d] border border-[#444] px-3 py-1 rounded text-[11px] font-semibold">
            <span className="text-slate-400 uppercase tracking-tighter">Format:</span>
            <select 
              value={dimension} onChange={(e) => setDimension(e.target.value as SpreadDimension)}
              className="bg-transparent border-none outline-none focus:ring-0 cursor-pointer text-slate-100"
            >
              {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
                <option key={key} value={key} className="bg-[#2d2d2d]">{label}</option>
              ))}
            </select>
          </div>

          <div className="relative" ref={globalBleedRef}>
            <button 
              onClick={() => setShowGlobalBleed(!showGlobalBleed)}
              className="text-slate-300 hover:text-white px-3 py-1.5 rounded text-[11px] font-bold transition-all flex items-center gap-2 uppercase tracking-wide border border-[#444] bg-[#2d2d2d] hover:bg-[#3d3d3d]"
            >
              Global Bleed: {globalBleedValue}"
            </button>
            {showGlobalBleed && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#2d2d2d] border border-[#444] p-4 rounded shadow-2xl z-[100]">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Apply to all</span>
                  <span className="text-[9px] font-black text-blue-400">{globalBleedValue}"</span>
                </div>
                <input 
                  type="range" min="0" max="10" step="0.5" value={globalBleedValue} 
                  onChange={(e) => updateAllMargins(parseFloat(e.target.value))}
                  className="w-full h-1 bg-[#444] rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            )}
          </div>
          
          <div className="h-6 w-[1px] bg-[#333] mx-1" />

          <button 
            onClick={populateAll} disabled={images.length === 0}
            className="text-slate-300 hover:text-white px-3 py-1.5 rounded text-[11px] font-bold transition-all flex items-center gap-2 uppercase tracking-wide border border-[#444] bg-[#2d2d2d] hover:bg-[#3d3d3d]"
          >
            Auto Populate
          </button>

          <div className="relative" ref={exportMenuRef}>
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="text-white px-4 py-1.5 rounded text-[11px] font-bold transition-all flex items-center gap-2 uppercase tracking-wide border border-blue-500 bg-blue-600 hover:bg-blue-500 shadow-lg active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              Export...
            </button>

            {showExportMenu && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-[#1e1e1e] border border-[#444] rounded-lg shadow-2xl p-4 z-[100] flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">File Format</span>
                  <div className="grid grid-cols-2 gap-1">
                    {(['JPG', 'PDF'] as const).map((f) => (
                      <button 
                        key={f} onClick={() => setExportFormat(f)}
                        className={`py-1.5 rounded text-[9px] font-black border transition-all ${exportFormat === f ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#2d2d2d] border-[#3d3d3d] text-slate-400 hover:text-white'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Quality</span>
                  <div className="flex flex-col gap-1">
                    {(['Draft', 'Standard', 'Print'] as const).map((q) => (
                      <button 
                        key={q} onClick={() => setExportQuality(q)}
                        className={`px-3 py-2 rounded text-[10px] font-bold text-left flex justify-between items-center border transition-all ${exportQuality === q ? 'bg-[#333] border-blue-600/50 text-blue-400' : 'bg-transparent border-transparent text-slate-500 hover:bg-[#2d2d2d] hover:text-slate-300'}`}
                      >
                        {q}
                        <span className="text-[8px] opacity-60">
                          {q === 'Draft' ? '72 DPI' : q === 'Standard' ? '150 DPI' : '300 DPI'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-[#333] my-1" />

                <button 
                  onClick={performExport}
                  disabled={isExporting}
                  className={`w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-widest rounded transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] ${isExporting ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {isExporting ? 'Processing All Spreads...' : `Download ${exportFormat}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden bg-[#1a1a1a]">
        <aside 
          className="bg-[#252525] border-r border-[#333] flex flex-col z-20 relative overflow-hidden transition-[width] duration-75 ease-out shadow-2xl" 
          style={{ width: sidebarWidth }}
        >
          <div className="p-4 border-b border-[#333] flex items-center justify-between bg-[#2d2d2d] shrink-0">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Library Assets ({images.length})</h2>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-500 hover:text-blue-400 p-1 transition-colors bg-blue-500/10 rounded-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
            </button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 hide-scrollbar grid gap-3 auto-rows-max relative min-h-0" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(130px, 1fr))` }} onDragLeave={() => setLibraryDropTarget(null)}>
            {images.length === 0 ? (
              <div className="col-span-full h-full flex flex-col items-center justify-center text-center opacity-40 py-20 border-2 border-dashed border-[#444] rounded-lg m-2">
                <svg className="w-12 h-12 mb-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Library Empty</p>
                <button onClick={() => fileInputRef.current?.click()} className="mt-4 px-4 py-2 bg-[#333] hover:bg-blue-600 text-white rounded text-[8px] font-black uppercase transition-all">Add Photos</button>
              </div>
            ) : (
              images.map((img, idx) => (
                <div key={img.id} className="relative group/libraryitem">
                  {getDropIndicator(idx)}
                  <LibraryItem 
                    image={img} index={idx} onDragStart={handleLibraryDragStart} 
                    onDragOver={handleLibraryDragOver} onDrop={handleLibraryDrop} 
                    onDelete={handleRemoveImageFromLibrary}
                    isSingleColumn={isSingleColumn}
                  />
                  {placedStatus[img.id] && (
                    <div className="absolute top-1.5 right-1.5 bg-blue-600 rounded-full p-1 shadow-lg border border-white/20 z-10">
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div className="p-3 border-t border-[#333] bg-[#222] shrink-0">
            <div className="flex justify-between items-center text-[9px] text-slate-500 uppercase font-black tracking-widest">
               <div className="flex gap-4">
                  <span>PLACED: {Object.values(placedStatus).filter(Boolean).length}</span>
               </div>
               <div className="flex gap-4">
                <button onClick={() => setImages([])} className="text-red-900 hover:text-red-500 transition-colors uppercase font-black">Purge Lib</button>
                <button onClick={clearSpread} className="text-slate-400 hover:text-white transition-colors uppercase font-black">Reset Spread</button>
               </div>
            </div>
          </div>
        </aside>

        <div onMouseDown={startResizing} className="w-1.5 bg-[#111] hover:bg-blue-600 cursor-col-resize z-30 transition-colors border-x border-[#333]" />

        <main className="flex-1 overflow-y-auto bg-[#181818] hide-scrollbar scroll-smooth relative">
          <div className="py-24 px-12 flex flex-wrap justify-center gap-x-12 gap-y-40 min-h-full relative z-10">
            {spreads.map((spread, sIdx) => (
              <div key={spread.leftIdx} className="group relative flex flex-col items-center">
                <div className="absolute -top-12 left-0 w-full flex justify-between px-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100 transition-all pointer-events-none">
                  <span className="bg-[#222] px-2 py-0.5 rounded border border-[#333]">Spread {sIdx + 1}</span>
                  <div className="flex gap-4">
                    <span>P.{spread.leftIdx + 1}</span>
                    {spread.rightIdx !== null && <span>P.{spread.rightIdx + 1}</span>}
                  </div>
                </div>

                <div className="flex shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8)] bg-white rounded-[1px] overflow-visible ring-1 ring-black/10">
                   <div className="relative group/page">
                      <Page 
                        pageIndex={spread.leftIdx} config={pageConfigs[spread.leftIdx]} 
                        images={(paginatedImages[spread.leftIdx] || []).map(img => img as PhotoImage)} 
                        ratio={currentRatio} width={dynamicPageWidth}
                        imageScales={imageScales}
                        onDrop={handleDropOnPage} onDragStart={handleSpreadDragStart}
                        onRemoveImage={handleRemoveImageFromPage}
                        onScaleChange={handleScaleChange}
                      />
                      <PageActionBar 
                        index={spread.leftIdx} config={pageConfigs[spread.leftIdx]} 
                        zoomLevel={zoomLevel} width={dynamicPageWidth}
                        updatePageLayout={updatePageLayout} updatePageCrop={updatePageCrop}
                        updatePageMargin={updatePageMargin}
                        onDeletePage={deletePage}
                      />
                   </div>

                   {spread.rightIdx !== null && (
                     <div className="relative group/page">
                        <Page 
                          pageIndex={spread.rightIdx} config={pageConfigs[spread.rightIdx]} 
                          images={(paginatedImages[spread.rightIdx] || []).map(img => img as PhotoImage)} 
                          ratio={currentRatio} width={dynamicPageWidth}
                          isRightPage
                          imageScales={imageScales}
                          onDrop={handleDropOnPage} onDragStart={handleSpreadDragStart}
                          onRemoveImage={handleRemoveImageFromPage}
                          onScaleChange={handleScaleChange}
                        />
                        <PageActionBar 
                          index={spread.rightIdx} config={pageConfigs[spread.rightIdx]} 
                          zoomLevel={zoomLevel} width={dynamicPageWidth}
                          updatePageLayout={updatePageLayout} updatePageCrop={updatePageCrop}
                          updatePageMargin={updatePageMargin}
                          onDeletePage={deletePage}
                        />
                     </div>
                   )}
                </div>

                <button 
                  onClick={() => removeSpreadAt(spread.leftIdx)}
                  className="absolute -top-8 right-0 text-slate-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 flex items-center gap-2 text-[8px] font-black uppercase z-20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  Remove Spread
                </button>
              </div>
            ))}

            <div className="w-full flex justify-center py-20">
              <button 
                onClick={addSpread}
                className="px-12 py-5 bg-[#222] border border-[#333] rounded-full text-slate-500 text-[10px] font-black uppercase tracking-[0.5em] hover:bg-[#2a2a2a] hover:text-white transition-all shadow-2xl active:scale-95 border-dashed"
              >
                Append New Spread
              </button>
            </div>
          </div>
        </main>
      </div>

      <footer className="h-8 border-t bg-[#1e1e1e] border-[#333] px-4 flex items-center justify-between shrink-0 text-slate-500 text-[9px] z-30 font-black uppercase tracking-[0.2em]">
        <div className="flex gap-8">
          <span className="text-slate-400">WS_SIZE: {Math.round(windowWidth - sidebarWidth)}PX</span>
          <span className="text-slate-400">PAGES: {pageConfigs.length}</span>
          <span className="text-slate-400">ASSETS: {images.length}</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
