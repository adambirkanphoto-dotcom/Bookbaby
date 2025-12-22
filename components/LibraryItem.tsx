
import React, { useRef } from 'react';
import { PhotoImage } from '../types';

interface LibraryItemProps {
  image: PhotoImage;
  index: number;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number, side: 'left' | 'right' | 'top' | 'bottom') => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDelete?: (id: string) => void;
  isSingleColumn?: boolean;
}

export const LibraryItem: React.FC<LibraryItemProps> = ({ 
  image, 
  index, 
  onDragStart, 
  onDragOver, 
  onDrop,
  onDelete,
  isSingleColumn = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    
    if (isSingleColumn) {
      const y = e.clientY - rect.top;
      const side = y < rect.height / 2 ? 'top' : 'bottom';
      onDragOver(e, index, side);
    } else {
      const x = e.clientX - rect.left;
      const side = x < rect.width / 2 ? 'left' : 'right';
      onDragOver(e, index, side);
    }
  };

  return (
    <div
      ref={containerRef}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={handleDragOver}
      onDrop={(e) => onDrop(e, index)}
      className="group relative aspect-square bg-[#333] rounded overflow-hidden cursor-grab active:cursor-grabbing transition-all hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 hover:ring-offset-[#1a1a1a] shadow-lg border border-[#444]"
    >
      <img 
        src={image.url} 
        alt={image.name} 
        className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-110"
      />
      
      {/* Index Badge */}
      <div className="absolute top-1 left-1 bg-black/70 text-white text-[8px] font-black w-4 h-4 rounded-sm flex items-center justify-center border border-white/10 opacity-60 group-hover:opacity-100 transition-opacity">
        {index + 1}
      </div>

      {/* Delete Overlay Button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(image.id);
          }}
          className="absolute top-1 right-1 w-5 h-5 bg-red-600/90 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all shadow-xl z-20"
          title="Remove from Library"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      )}

      {/* Status Indicators */}
      <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-2 border-blue-500/50 m-0.5 rounded-sm" />
      
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1 translate-y-full group-hover:translate-y-0 transition-transform">
        <p className="text-[7px] text-white font-medium truncate">{image.name}</p>
      </div>
    </div>
  );
};
