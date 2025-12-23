
import React, { useRef, useState } from 'react';
import { PhotoImage } from '../types';
import { Tooltip } from '../App';

interface LibraryItemProps {
  image: PhotoImage;
  index: number;
  isPlaced: boolean;
  isSelected?: boolean;
  onClick?: () => void;
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
  isSelected = false,
  onClick,
  onDragStart, 
  onDragOver, 
  onDrop,
  onDelete,
  isSingleColumn = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragSide, setDragSide] = useState<'left' | 'right' | null>(null);

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
    const midpoint = rect.left + rect.width / 2;
    const side = e.clientX < midpoint ? 'left' : 'right';
    
    setDragSide(side);
    onDragOver(e, index, side as any); 
  };

  const handleDrop = (e: React.DragEvent) => {
    let targetIndex = index;
    if (dragSide === 'right') {
        targetIndex = index + 1;
    }
    setDragSide(null);
    onDrop(e, targetIndex);
  };

  const handleDragLeave = () => {
    setDragSide(null);
  };

  return (
    <div
      ref={containerRef}
      draggable
      onClick={onClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative aspect-square bg-[#1a1a1a] rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-200 border ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-[#333] hover:border-blue-500/50'} hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] ${isDragging ? 'scale-75 opacity-70' : 'scale-100'}`}
    >
      {dragSide === 'left' && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 z-50 rounded-full shadow-[0_0_8px_#3b82f6]" />
      )}
      {dragSide === 'right' && (
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500 z-50 rounded-full shadow-[0_0_8px_#3b82f6]" />
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
