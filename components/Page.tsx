
import React, { useState } from 'react';
import { PageConfig, PhotoImage } from '../types';

interface PageProps {
  pageIndex: number;
  config: PageConfig;
  images: (PhotoImage | null)[];
  ratio: number;
  width?: number;
  isRightPage?: boolean;
  imageScales?: Record<string, number>;
  onDrop?: (pageIndex: number, slotIndex: number) => void;
  onDragStart?: (e: React.DragEvent, pageIndex: number, slotIndex: number) => void;
  onRemoveImage?: (imageId: string) => void;
  onScaleChange?: (imageId: string, scale: number) => void;
}

export const Page: React.FC<PageProps> = ({ 
  pageIndex, 
  config, 
  images, 
  ratio, 
  width = 450, 
  isRightPage, 
  imageScales = {},
  onDrop, 
  onDragStart,
  onRemoveImage,
  onScaleChange
}) => {
  const [activeDropSlot, setActiveDropSlot] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent, slotIdx: number) => {
    e.preventDefault();
    setActiveDropSlot(slotIdx);
  };

  const handleDragLeave = () => {
    setActiveDropSlot(null);
  };

  const handleSlotDrop = (e: React.DragEvent, slotIdx: number) => {
    e.preventDefault();
    setActiveDropSlot(null);
    if (onDrop) onDrop(pageIndex, slotIdx);
  };

  // Robust dimension handling
  const safeRatio = ratio || 1;
  const containerStyle = {
    width: `${width}px`,
    height: `${width / safeRatio}px`,
    transition: 'width 0.1s ease-out, height 0.1s ease-out'
  };

  const marginVal = config?.margin || 0;
  const paddingValue = (marginVal / 16) * width;

  const renderSlot = (i: number) => {
    const isActive = activeDropSlot === i;
    const image = images[i];
    const scale = image ? (imageScales[image.id] || 1) : 1;

    return (
      <div 
        key={i} 
        onDragOver={(e) => handleDragOver(e, i)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleSlotDrop(e, i)}
        className={`h-full relative overflow-hidden rounded-[1px] flex items-center justify-center border border-black/5 shadow-inner transition-all duration-300 ${isActive ? 'bg-blue-600/20 ring-4 ring-blue-500 ring-inset ring-offset-0' : 'bg-slate-200'}`}
      >
        {image ? (
          <div className="relative w-full h-full group/image">
            <div className="w-full h-full overflow-hidden flex items-center justify-center">
              <img 
                src={image.url} 
                draggable
                onDragStart={(e) => onDragStart && onDragStart(e, pageIndex, i)}
                style={{ transform: `scale(${scale})` }}
                className={`w-full h-full transition-transform duration-75 cursor-grab active:cursor-grabbing hover:brightness-105 ${config.cropType === 'fill' ? 'object-cover' : 'object-contain'}`}
              />
            </div>
            
            {/* Image Controls Overlay */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/image:opacity-100 transition-opacity pointer-events-none flex flex-col justify-between p-2">
              <div className="flex justify-end pointer-events-auto">
                {onRemoveImage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveImage(image.id);
                    }}
                    className="w-6 h-6 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all z-20 shadow-lg"
                    title="Remove image"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Scale Slider */}
              <div className="bg-black/70 backdrop-blur-sm p-2 rounded-lg flex items-center gap-2 pointer-events-auto transform translate-y-2 group-hover/image:translate-y-0 transition-transform">
                <svg className="w-3 h-3 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
                </svg>
                <input 
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={scale}
                  onChange={(e) => onScaleChange && onScaleChange(image.id, parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-400"
                />
                <span className="text-[9px] font-black text-white min-w-[24px] text-right">
                  {Math.round(scale * 100)}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-slate-400 text-[8px] font-black uppercase tracking-widest opacity-40">Drop Photo</div>
        )}
        
        {isActive && (
          <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center pointer-events-none z-10">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transform scale-110">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11V9h1.707L10 11.707 7.293 9H9V7h2z"/>
              </svg>
            </div>
          </div>
        )}

        <div className="absolute top-1 left-1 bg-black/10 text-black/20 text-[6px] font-black px-1 rounded-sm pointer-events-none">
          SLOT {i + 1}
        </div>
      </div>
    );
  };

  const renderLayout = () => {
    const layoutClasses = "h-full transition-all duration-300";
    const layoutStyle = { padding: `${paddingValue}px` };

    switch (config?.layout) {
      case 'double':
        return (
          <div className={`grid grid-cols-2 gap-3 ${layoutClasses}`} style={layoutStyle}>
            {Array.from({ length: 2 }).map((_, i) => renderSlot(i))}
          </div>
        );
      case 'grid-4':
        return (
          <div className={`grid grid-cols-2 grid-rows-2 gap-2 ${layoutClasses}`} style={layoutStyle}>
            {Array.from({ length: 4 }).map((_, i) => renderSlot(i))}
          </div>
        );
      case 'single':
      default:
        return (
          <div className={`${layoutClasses}`} style={layoutStyle}>
            {renderSlot(0)}
          </div>
        );
    }
  };

  return (
    <div 
      className={`bg-white relative overflow-visible flex flex-col ${isRightPage ? 'border-l border-slate-300 shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.1)]' : 'shadow-[5px_0_15px_-5px_rgba(0,0,0,0.1)]'}`}
      style={containerStyle}
    >
      <div className="flex-1 overflow-hidden">
        {renderLayout()}
      </div>
      
      {!isRightPage && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black/[0.06] to-transparent z-10 pointer-events-none" />
      )}
      {isRightPage && (
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black/[0.06] to-transparent z-10 pointer-events-none" />
      )}
      
      <div className="absolute inset-0 border border-black/[0.03] pointer-events-none" />
    </div>
  );
};
