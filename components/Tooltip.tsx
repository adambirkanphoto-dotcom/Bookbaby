
import React, { useState, useRef } from 'react';

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
