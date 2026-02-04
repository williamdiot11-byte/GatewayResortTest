
import React from 'react';
import { ROOMS } from '../constants.tsx';
import { ArrowRight } from 'lucide-react';

interface AccommodationsProps {
  onExploreMore: () => void;
}

const Accommodations: React.FC<AccommodationsProps> = ({ onExploreMore }) => {
  const previewRooms = ROOMS.slice(0, 4);

  return (
    <section id="rooms" className="py-24 bg-cozy" aria-labelledby="accommodations-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-xl">
            <h2 id="accommodations-title" className="text-sm font-bold tracking-widest text-orange-600 uppercase mb-3">Your Stay</h2>
            <p className="text-4xl sm:text-6xl font-serif font-black text-slate-900 leading-tight">Cozy Rooms & Traditional Kubos</p>
          </div>
          <p className="text-slate-600 max-w-sm text-lg italic">
            Choose from our 14 distinct accommodations, from modern air-conditioned suites to rustic Filipino kubos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {previewRooms.map((room) => (
            <article 
              key={room.id}
              className="bg-parchment rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all group border border-orange-200/20"
            >
              <div className="relative h-80 overflow-hidden">
                <img 
                  src={room.image} 
                  alt={`${room.name} - Gateway Resort Accommodation`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                  loading="lazy"
                />
                <div className="absolute top-6 right-6 px-5 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                  {room.type}
                </div>
              </div>
              <div className="p-10">
                <h3 className="text-3xl font-serif font-bold text-slate-900 mb-4">{room.name}</h3>
                <p className="text-slate-600 mb-8 line-clamp-2 text-lg leading-relaxed">
                  {room.description}
                </p>
                <div className="flex items-center gap-6 text-xs font-bold text-slate-500 mb-10 border-b border-orange-100 pb-8 uppercase tracking-widest">
                  <span className="flex items-center gap-2" aria-label="Bed type">🛏️ Queen/King</span>
                  <span className="flex items-center gap-2" aria-label="Climate control">❄️ Air Con</span>
                  <span className="flex items-center gap-2" aria-label="View">🌊 Sea View</span>
                </div>
                <button 
                  onClick={onExploreMore}
                  aria-label={`View details for ${room.name}`}
                  className="w-full py-5 bg-slate-900 rounded-2xl font-bold text-white hover:bg-orange-600 transition-all flex items-center justify-center gap-2 text-lg shadow-xl focus:ring-4 focus:ring-orange-200 outline-none"
                >
                  View All Details
                </button>
              </div>
            </article>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <button 
            onClick={onExploreMore}
            className="inline-flex items-center gap-2 px-12 py-5 bg-parchment border-2 border-slate-900 text-slate-900 rounded-2xl font-bold text-lg hover:bg-slate-900 hover:text-white transition-all shadow-xl focus:ring-4 focus:ring-slate-200 outline-none"
          >
            Explore All 14 Rooms <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>

        <aside className="mt-24 p-12 bg-orange-600 rounded-[3.5rem] text-center text-white relative overflow-hidden shadow-2xl">
           <div className="relative z-10">
              <h3 className="text-4xl sm:text-5xl font-serif font-black mb-6">Planning a Special Event?</h3>
              <p className="text-orange-50 mb-10 max-w-2xl mx-auto text-xl leading-relaxed">
                We offer exclusive full-resort rental for weddings, corporate retreats, and large family reunions. 
              </p>
              <button 
                onClick={onExploreMore}
                className="inline-block px-12 py-5 bg-parchment text-orange-600 rounded-full font-bold text-xl hover:bg-slate-900 hover:text-white transition-all transform hover:-translate-y-1 shadow-2xl focus:ring-4 focus:ring-white/20 outline-none"
              >
                Get a Custom Quote
              </button>
           </div>
           <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" aria-hidden="true"></div>
        </aside>
      </div>
    </section>
  );
};

export default Accommodations;
