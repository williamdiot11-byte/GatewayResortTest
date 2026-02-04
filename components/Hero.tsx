
import React, { useState, useEffect } from 'react';
import { HERO_IMAGES } from '../constants';

interface HeroProps {
  onExploreRooms: () => void;
  onInquireNow: () => void;
}

const Hero: React.FC<HeroProps> = ({ onExploreRooms, onInquireNow }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        {HERO_IMAGES.map((img, index) => (
          <img
            key={img}
            src={img}
            alt="Resort View"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[3000ms] ${
              index === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-slate-900/40"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/40"></div>
      </div>

      <div className="relative z-10 text-center px-6 mt-16">
        <h1 className="text-8xl sm:text-[14rem] font-serif font-black text-white leading-[0.75] mb-6 tracking-tighter drop-shadow-2xl">
          Gateway <br />
          <span className="text-orange-400 italic font-light">Resort</span>
        </h1>
        
        <p className="text-2xl sm:text-5xl text-white font-serif font-light italic mb-16 tracking-[0.2em] opacity-90">
          your seaside serenity
        </p>

        <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mt-10">
          <button
            onClick={onExploreRooms}
            className="group relative overflow-hidden px-16 py-7 bg-white text-slate-900 rounded-full font-black text-sm tracking-[0.3em] uppercase hover:bg-orange-600 hover:text-white transition-all shadow-2xl"
          >
            <span className="relative z-10">Explore Rooms</span>
            {/* Black loading bar for Explore Rooms */}
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-900 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left"></div>
          </button>
          
          <button
            onClick={onInquireNow}
            className="group relative overflow-hidden px-16 py-7 bg-transparent border-2 border-white/30 text-white rounded-full font-black text-sm tracking-[0.3em] uppercase hover:bg-white/10 hover:border-white transition-all backdrop-blur-md"
          >
            <span className="relative z-10">Inquire Now</span>
            {/* Orange loading bar for Inquire Now */}
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-orange-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left"></div>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
