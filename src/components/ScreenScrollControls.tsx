import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsUp, ChevronsDown } from 'lucide-react';

interface ScreenScrollControlsProps {
  theme?: string;
}

export default function ScreenScrollControls({ theme = 'dark' }: ScreenScrollControlsProps) {
  const [verticalProgress, setVerticalProgress] = useState(0);
  const [horizontalProgress, setHorizontalProgress] = useState(0);
  const [canScrollHorizontal, setCanScrollHorizontal] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isHoveredVertical, setIsHoveredVertical] = useState(false);
  const [isHoveredBottom, setIsHoveredBottom] = useState(false);

  const verticalTrackRef = useRef<HTMLDivElement>(null);
  const horizontalTrackRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update scroll metrics
  const updateScrollMetrics = () => {
    const doc = document.documentElement;
    const win = window;

    // Vertical metrics
    const totalVerticalScroll = doc.scrollHeight - win.innerHeight;
    const currentVertical = win.scrollY || doc.scrollTop || 0;
    const vPercent = totalVerticalScroll > 0 ? Math.min(100, Math.max(0, (currentVertical / totalVerticalScroll) * 100)) : 0;
    setVerticalProgress(vPercent);

    // Horizontal metrics
    const totalHorizontalScroll = doc.scrollWidth - win.innerWidth;
    const currentHorizontal = win.scrollX || doc.scrollLeft || 0;
    const hPercent = totalHorizontalScroll > 0 ? Math.min(100, Math.max(0, (currentHorizontal / totalHorizontalScroll) * 100)) : 0;
    setHorizontalProgress(hPercent);
    setCanScrollHorizontal(totalHorizontalScroll > 5);

    // Flash active scrolling indicator
    setIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1200);
  };

  useEffect(() => {
    updateScrollMetrics();
    window.addEventListener('scroll', updateScrollMetrics, { passive: true });
    window.addEventListener('resize', updateScrollMetrics, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateScrollMetrics);
      window.removeEventListener('resize', updateScrollMetrics);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Quick scroll actions
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  const scrollUpStep = () => {
    window.scrollBy({ top: -window.innerHeight * 0.6, behavior: 'smooth' });
  };

  const scrollDownStep = () => {
    window.scrollBy({ top: window.innerHeight * 0.6, behavior: 'smooth' });
  };

  const scrollLeftStep = () => {
    window.scrollBy({ left: -window.innerWidth * 0.4, behavior: 'smooth' });
  };

  const scrollRightStep = () => {
    window.scrollBy({ left: window.innerWidth * 0.4, behavior: 'smooth' });
  };

  // Handle click on vertical track
  const handleVerticalTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!verticalTrackRef.current) return;
    const rect = verticalTrackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const percentage = Math.max(0, Math.min(1, clickY / rect.height));
    const doc = document.documentElement;
    const targetScroll = percentage * (doc.scrollHeight - window.innerHeight);
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  };

  // Handle click on bottom horizontal track
  const handleHorizontalTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!horizontalTrackRef.current) return;
    const rect = horizontalTrackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const doc = document.documentElement;
    
    // If page has horizontal overflow, scroll horizontally
    if (doc.scrollWidth > window.innerWidth) {
      const targetScrollX = percentage * (doc.scrollWidth - window.innerWidth);
      window.scrollTo({ left: targetScrollX, behavior: 'smooth' });
    } else {
      // Otherwise use bottom scrollbar as horizontal scrub for page vertical position
      const targetScrollY = percentage * (doc.scrollHeight - window.innerHeight);
      window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
    }
  };

  const isLight = theme === 'high-contrast';

  return (
    <>
      {/* 1. VERTICAL SCROLLBAR AT THE FAR END OF THE SCREEN (RIGHT EDGE) */}
      <aside 
        aria-label="Vertical Page Navigation Scrollbar"
        className="fixed right-1.5 sm:right-2 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center select-none"
        onMouseEnter={() => setIsHoveredVertical(true)}
        onMouseLeave={() => setIsHoveredVertical(false)}
        id="screen-vertical-scrollbar"
      >
        <div 
          className={`flex flex-col items-center p-1 rounded-2xl backdrop-blur-md border transition-all duration-300 shadow-2xl ${
            isLight
              ? 'bg-white/90 border-slate-300 text-slate-700 shadow-slate-400/20'
              : 'bg-zinc-950/85 border-zinc-800/90 text-gray-300 shadow-black/80'
          } ${isHoveredVertical || isScrolling ? 'opacity-100 scale-100 ring-1 ring-emerald-500/30' : 'opacity-70 hover:opacity-100'}`}
        >
          {/* Scroll to Top Button */}
          <button
            onClick={scrollToTop}
            title="Scroll to Top of Screen"
            aria-label="Scroll to top"
            className={`p-1.5 rounded-xl transition-all cursor-pointer ${
              isLight 
                ? 'hover:bg-slate-200 hover:text-emerald-600' 
                : 'hover:bg-zinc-800 hover:text-emerald-400'
            }`}
          >
            <ChevronsUp className="w-3.5 h-3.5" />
          </button>

          {/* Up Step Button */}
          <button
            onClick={scrollUpStep}
            title="Page Up"
            aria-label="Page up"
            className={`p-1 rounded-lg transition-all cursor-pointer ${
              isLight 
                ? 'hover:bg-slate-200 hover:text-emerald-600' 
                : 'hover:bg-zinc-800 hover:text-emerald-400'
            }`}
          >
            <ChevronUp className="w-3 h-3" />
          </button>

          {/* Interactive Vertical Track */}
          <div 
            ref={verticalTrackRef}
            onClick={handleVerticalTrackClick}
            className={`relative w-2.5 h-32 sm:h-44 my-1.5 rounded-full cursor-pointer overflow-hidden transition-all ${
              isLight ? 'bg-slate-200 hover:w-3' : 'bg-zinc-900 hover:w-3 border border-zinc-800'
            }`}
            title={`Vertical Position: ${Math.round(verticalProgress)}% (Click to jump)`}
          >
            {/* Scroll Progress Fill */}
            <div 
              className="absolute top-0 left-0 right-0 rounded-full bg-gradient-to-b from-emerald-500 via-teal-400 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-75"
              style={{ height: `${Math.max(8, verticalProgress)}%` }}
            />
            {/* Draggable Thumb Indicator */}
            <div 
              className="absolute left-0 right-0 h-4 -mt-2 rounded-full bg-white border border-emerald-500 shadow-md transition-all pointer-events-none"
              style={{ top: `${verticalProgress}%` }}
            />
          </div>

          {/* Down Step Button */}
          <button
            onClick={scrollDownStep}
            title="Page Down"
            aria-label="Page down"
            className={`p-1 rounded-lg transition-all cursor-pointer ${
              isLight 
                ? 'hover:bg-slate-200 hover:text-emerald-600' 
                : 'hover:bg-zinc-800 hover:text-emerald-400'
            }`}
          >
            <ChevronDown className="w-3 h-3" />
          </button>

          {/* Scroll to Bottom Button */}
          <button
            onClick={scrollToBottom}
            title="Scroll to Bottom of Screen"
            aria-label="Scroll to bottom"
            className={`p-1.5 rounded-xl transition-all cursor-pointer ${
              isLight 
                ? 'hover:bg-slate-200 hover:text-emerald-600' 
                : 'hover:bg-zinc-800 hover:text-emerald-400'
            }`}
          >
            <ChevronsDown className="w-3.5 h-3.5" />
          </button>

          {/* Percentage badge on hover/scrolling */}
          <div className="mt-1">
            <span className={`text-[9px] font-mono font-black px-1 py-0.5 rounded transition-all ${
              isLight ? 'bg-slate-200 text-slate-700' : 'bg-zinc-900 text-emerald-400 border border-zinc-800'
            }`}>
              {Math.round(verticalProgress)}%
            </span>
          </div>
        </div>
      </aside>

      {/* 2. HORIZONTAL SCROLLBAR AT THE BOTTOM OF THE SCREEN */}
      <div 
        aria-label="Horizontal Bottom Screen Scrollbar"
        className="fixed bottom-0 left-0 right-0 z-40 select-none pointer-events-auto"
        onMouseEnter={() => setIsHoveredBottom(true)}
        onMouseLeave={() => setIsHoveredBottom(false)}
        id="screen-bottom-scrollbar"
      >
        <div 
          className={`w-full flex items-center px-2 py-1 backdrop-blur-md border-t transition-all duration-300 ${
            isLight 
              ? 'bg-white/95 border-slate-300 text-slate-700 shadow-lg shadow-slate-300' 
              : 'bg-zinc-950/90 border-zinc-800/90 text-gray-300 shadow-2xl'
          } ${isHoveredBottom || isScrolling ? 'opacity-100' : 'opacity-85 hover:opacity-100'}`}
        >
          {/* Scroll Left Button */}
          <button
            onClick={scrollLeftStep}
            title="Scroll Left"
            aria-label="Scroll left"
            className={`p-1 rounded-lg transition-all cursor-pointer shrink-0 mr-1.5 ${
              isLight 
                ? 'hover:bg-slate-200 hover:text-emerald-600' 
                : 'hover:bg-zinc-800 hover:text-emerald-400'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Interactive Horizontal Scroll Track */}
          <div 
            ref={horizontalTrackRef}
            onClick={handleHorizontalTrackClick}
            className={`relative flex-1 h-2 sm:h-2.5 rounded-full cursor-pointer overflow-hidden transition-all mx-1 ${
              isLight 
                ? 'bg-slate-200 hover:h-3.5' 
                : 'bg-zinc-900 hover:h-3.5 border border-zinc-800/80'
            }`}
            title={`Scroll Position: ${Math.round(canScrollHorizontal ? horizontalProgress : verticalProgress)}% (Click to jump)`}
          >
            {/* Gradient Scroll Fill */}
            <div 
              className="absolute top-0 bottom-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-75"
              style={{ width: `${Math.max(3, canScrollHorizontal ? horizontalProgress : verticalProgress)}%` }}
            />
            {/* Draggable thumb cursor */}
            <div 
              className="absolute top-0 bottom-0 w-3 -ml-1.5 rounded-full bg-white border border-emerald-500 shadow transition-all pointer-events-none"
              style={{ left: `${canScrollHorizontal ? horizontalProgress : verticalProgress}%` }}
            />
          </div>

          {/* Scroll Right Button */}
          <button
            onClick={scrollRightStep}
            title="Scroll Right"
            aria-label="Scroll right"
            className={`p-1 rounded-lg transition-all cursor-pointer shrink-0 ml-1.5 mr-2 ${
              isLight 
                ? 'hover:bg-slate-200 hover:text-emerald-600' 
                : 'hover:bg-zinc-800 hover:text-emerald-400'
            }`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Scroll percentage indicator & Mode Tag */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0 pl-1 border-l border-zinc-800 text-[10px] font-mono">
            <span className="text-gray-400 font-semibold">
              {canScrollHorizontal ? 'H-Scroll' : 'Scroll'}:
            </span>
            <span className={`font-bold px-1.5 py-0.5 rounded ${
              isLight ? 'bg-slate-200 text-emerald-700' : 'bg-zinc-900 text-emerald-400 border border-zinc-800'
            }`}>
              {Math.round(canScrollHorizontal ? horizontalProgress : verticalProgress)}%
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
