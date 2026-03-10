
import React, { useEffect, useRef, useState } from 'react';
import { AMENITIES, getIcon } from '../constants.tsx';

const Amenities: React.FC<{ onSeeRooms: () => void }> = ({ onSeeRooms }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const requestRef = useRef<number>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const update = () => {
        const sectionTop = containerRef.current!.offsetTop;
        const sectionHeight = containerRef.current!.offsetHeight;
        const windowHeight = window.innerHeight;
        const currentScroll = window.pageYOffset;
        
        const start = sectionTop;
        const end = sectionTop + sectionHeight - windowHeight;
        const progress = Math.min(Math.max((currentScroll - start) / (end - start), 0), 1);
        setScrollProgress(progress);
      };

      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const beachColors = [
    'bg-[#D1F2EB]', 
    'bg-[#FADBD8]', 
    'bg-[#D6EAF8]', 
    'bg-[#FAE5D3]', 
    'bg-[#FCF3CF]', 
    'bg-[#D5F5E3]'  
  ];

  const getInitialOffset = (index: number) => {
    const offsets = [
      { x: -160, y: -160 }, 
      { x: 160, y: -160 },  
      { x: -180, y: 0 },    
      { x: 180, y: 0 },     
      { x: 160, y: 160 },   
      { x: -160, y: 160 }   
    ];
    return offsets[index];
  };

  const getRingOffset = (index: number) => {
    const distH = 22; 
    const distV = 18; 
    const midH = 28;  
    const offsets = [
      { x: -distH, y: -distV }, 
      { x: distH, y: -distV },  
      { x: -midH, y: 0 },       
      { x: midH, y: 0 },        
      { x: distH, y: distV },   
      { x: -distH, y: distV }   
    ];
    return offsets[index];
  };

  const flyP = Math.min(Math.max((scrollProgress - 0.02) / 0.28, 0), 1);
  const syncP = Math.min(Math.max((scrollProgress - 0.30) / 0.40, 0), 1);
  const exitP = Math.min(Math.max((scrollProgress - 0.88) / 0.12, 0), 1);
  const unzoomP = Math.min(Math.max(scrollProgress / 0.55, 0), 1);
  const fadeP = Math.min(Math.max((scrollProgress - 0.25) / 0.30, 0), 1);

  const getCardStyle = (index: number) => {
    const initial = getInitialOffset(index);
    const ring = getRingOffset(index);
    const ringX = (initial.x * (1 - flyP)) + (ring.x * flyP);
    const ringY = (initial.y * (1 - flyP)) + (ring.y * flyP);
    const stackY = -15;
    const currentX = ringX * (1 - syncP);
    const currentY = (ringY * (1 - syncP)) + (stackY * syncP);
    const exitYOffset = exitP * -120;
    const scale = (0.3 + (flyP * 0.5)) * (1 - (syncP * 0.2));

    return {
      transform: `translate3d(${currentX}vw, ${currentY + exitYOffset}vh, 0) scale(${scale})`,
      opacity: flyP > 0.01 ? 1 : flyP * 100,
      zIndex: 100 + index, 
      borderRadius: syncP > 0.5 ? '6rem' : '2.5rem',
      boxShadow: `0 25px 50px -12px rgba(0,0,0,${0.2 + (flyP * 0.3)})`,
      willChange: 'transform, opacity'
    };
  };

  const hScale = 1.5 - (unzoomP * 1.2);
  const hOpacity = 1 - fadeP;
  const ctaRevealP = Math.min(Math.max((scrollProgress - 0.65) / 0.20, 0), 1);
  const ctaTargetY = 25; 
  const ctaEntranceY = (1 - ctaRevealP) * 10; 
  const ctaExitY = exitP * -120; 

  return (
    <section ref={containerRef} id="amenities" className="relative h-[400vh] bg-cozy" aria-label="Resort Amenities">
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        
        <div 
          className="absolute z-10 text-center pointer-events-none will-change-transform"
          style={{ 
            transform: `scale(${Math.max(0.01, hScale)})`,
            opacity: Math.max(0, hOpacity)
          }}
        >
          <h2 className="text-sm font-black tracking-[0.8em] text-orange-600 uppercase mb-8">refined amenities</h2>
          <p className="text-7xl sm:text-[11rem] font-serif font-black text-slate-900 leading-[0.8] tracking-tighter">
            World-Class <br /> <span className="italic font-light">Comfort</span>
          </p>
        </div>

        <div 
          className="absolute inset-0 flex items-center justify-center z-20 will-change-transform pointer-events-none"
          style={{ 
            transform: `translate3d(0, ${ctaTargetY + ctaEntranceY + ctaExitY}vh, 0)`,
            opacity: ctaRevealP,
            visibility: scrollProgress > 0.6 ? 'visible' : 'hidden'
          }}
        >
          <button 
            onClick={onSeeRooms}
            aria-label="View room collection"
            className="group flex flex-col items-center justify-center cursor-pointer pointer-events-auto transition-transform hover:scale-105 duration-500 focus:outline-none"
          >
            <div className="flex items-center gap-4 sm:gap-14">
               <span className="text-3xl sm:text-5xl animate-pulse" aria-hidden="true">✨</span>
               <span className="text-5xl sm:text-[11rem] font-serif font-black text-slate-900 border-b-[8px] sm:border-b-[24px] border-orange-500 pb-1 group-hover:text-orange-600 transition-colors uppercase tracking-tighter leading-none">
                See rooms
              </span>
              <span className="text-3xl sm:text-5xl animate-pulse" aria-hidden="true">✨</span>
            </div>
          </button>
        </div>

        <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
          {AMENITIES.map((item, idx) => (
            <div 
              key={idx} 
              className={`absolute w-80 h-80 p-8 border-4 border-white flex flex-col items-center text-center justify-center transition-shadow will-change-transform ${beachColors[idx % beachColors.length]}`}
              style={getCardStyle(idx)}
            >
              <div className="w-16 h-16 bg-white/60 text-slate-900 rounded-[2rem] flex items-center justify-center mb-5 shadow-sm">
                {getIcon(item.icon)}
              </div>
              <h3 className="text-xl font-serif font-black text-slate-900 mb-2 leading-tight">{item.name}</h3>
              <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.1em] leading-tight opacity-70 px-4">
                {item.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Amenities;
