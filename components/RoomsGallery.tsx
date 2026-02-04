
import React from 'react';
import { ROOMS } from '../constants';
import { CheckCircle2 } from 'lucide-react';

const RoomsGallery: React.FC = () => {
  return (
    <section className="bg-cozy min-h-screen pb-24">
      {/* Page Header */}
      <div className="bg-slate-900 py-32 px-4 relative overflow-hidden">
        <div className="max-w-7xl auto text-center relative z-10">
          <h1 className="text-6xl sm:text-8xl font-serif font-black text-white mb-8">Our Collection</h1>
          <p className="text-orange-200 text-2xl max-w-2xl mx-auto italic">
            Explore 14 unique sea-facing rooms, traditional kubos, and private cottages.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {ROOMS.map((room) => (
            <div 
              key={room.id}
              className="bg-parchment rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all border border-orange-200/20 flex flex-col h-full"
            >
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={room.image} 
                  alt={room.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-4 py-1.5 bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                    {room.type}
                  </span>
                </div>
              </div>
              <div className="p-8 flex flex-col flex-grow">
                <h3 className="text-2xl font-serif font-bold text-slate-900 mb-3">{room.name}</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-grow">
                  {room.description}
                </p>
                
                <div className="space-y-3 mb-8 border-t border-orange-100 pt-6">
                  <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-slate-700">
                    <CheckCircle2 size={16} className="text-orange-500" />
                    <span>Free WiFi & AC</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-slate-700">
                    <CheckCircle2 size={16} className="text-orange-500" />
                    <span>Sea View Balcony</span>
                  </div>
                </div>

                <a 
                  href="tel:09398449670"
                  className="w-full py-4 bg-orange-100/50 text-orange-700 rounded-xl font-bold text-center hover:bg-orange-600 hover:text-white transition-all text-xs uppercase tracking-[0.2em] border border-orange-200/30 shadow-sm"
                >
                  Reserve Now
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 mt-24">
        <div className="bg-slate-900 rounded-[3.5rem] p-20 text-center text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-4xl sm:text-6xl font-serif font-bold mb-8">Found your perfect room?</h2>
            <div className="flex flex-col sm:flex-row gap-8 justify-center">
              <a href="tel:09398449670" className="px-14 py-6 bg-orange-600 rounded-2xl font-bold text-xl hover:scale-105 transition-transform">Call Front Desk</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RoomsGallery;
