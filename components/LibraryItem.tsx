
import React, { useRef, useState } from 'react';
import { PhotoImage } from '../types';
import { Tooltip } from '../App';

interface LibraryItemProps {
  image: PhotoImage;
  index: number;
  isPlaced: boolean;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number, side: 'left' | 'right' | 'top' | 'bottom') => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDelete?: (id: string) => void;
  isSingleColumn?: boolean;
}

export const LibraryItem: React.FC<LibraryItemProps> = ({ 
  image, 
  index, 
  isPlaced,
  onDragStart, 
  onDragOver, 
  onDrop,
  onDelete,
  isSingleColumn = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragSide, setDragSide] = useState<'left' | 'right' | 'top' | 'bottom' | null>(null);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart(e, index);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragSide(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    let side: 'left' | 'right' | 'top' | 'bottom';
    
    if (isSingleColumn) {
      const y = e.clientY - rect.top;
      side = y < rect.height / 2 ? 'top' : 'bottom';
    } else {
      const x = e.clientX - rect.left;
      side = x < rect.width / 2 ? 'left' : 'right';
    }
    
    setDragSide(side);
    onDragOver(e, index, side);
  };

  const handleDrop = (e: React.DragEvent) => {
    setDragSide(null);
    onDrop(e, index);
  };

  const handleDragLeave = () => {
    setDragSide(null);
  };

  return (
    <div
      ref={containerRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative aspect-square bg-[#1a1a1a] rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-200 border border-[#333] hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] ${isDragging ? 'scale-90 opacity-40' : 'scale-100'}`}
    >
      {dragSide && (
        <div 
          className={`absolute z-30 bg-blue-500 transition-all pointer-events-none ${
            dragSide === 'left' ? 'left-0 top-0 bottom-0 w-1' :
            dragSide === 'right' ? 'right-0 top-0 bottom-0 w-1' :
            dragSide === 'top' ? 'top-0 left-0 right-0 h-1' :
            'bottom-0 left-0 right-0 h-1'
          }`} 
        />
      )}

      <img 
        src={image.url} 
        alt={image.name} 
        className={`w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-105 ${isPlaced ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}`}
      />
      
      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10 opacity-60 group-hover:opacity-100 transition-opacity">
        {index + 1}
      </div>

      {isPlaced && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-600/10 pointer-events-none">
          <div className="bg-blue-600 text-white p-1 rounded-full shadow-lg border-2 border-white/20 scale-100 transition-transform">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
          </div>
          <div className="absolute bottom-2 left-0 right-0 text-center">
            <span className="text-[8px] font-black uppercase text-blue-400 bg-black/60 px-2 py-0.5 rounded-full">Used</span>
          </div>
        </div>
      )}

      {onDelete && (
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-all">
          <Tooltip text="Remove from library" position="left">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(image.id);
              }}
              className="w-6 h-6 bg-red-600/90 hover:bg-red-500 text-white rounded-lg flex items-center justify-center shadow-xl"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </Tooltip>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
        <p className="text-[9px] text-white font-medium truncate leading-tight">{image.name}</p>
      </div>
    </div>
  );
};
