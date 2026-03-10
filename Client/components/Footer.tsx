
import React from 'react';
import { RESORT_DATA } from '../constants.tsx';

interface FooterProps {
  onNavigateHome: (sectionId?: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigateHome }) => {
  return (
    <footer className="bg-slate-900 text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 border-b border-slate-800 pb-20">
          <div className="space-y-8">
            <div className="cursor-pointer" onClick={() => onNavigateHome()}>
              <span className="text-3xl font-bold tracking-tight text-orange-500 uppercase italic block">
                Gateway <span className="text-white font-medium not-italic">Resort</span>
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed text-lg">
              Your modern oasis in Bauang, La Union. Providing high-quality hospitality and sea-facing comfort since 2019.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-xl mb-8 uppercase tracking-widest text-orange-500">Quick Links</h4>
            <ul className="space-y-5 text-slate-300 text-lg">
              <li><button onClick={() => onNavigateHome('amenities')} className="hover:text-orange-500 transition-colors">Amenities</button></li>
              <li><button onClick={() => window.scrollTo(0,0)} className="hover:text-orange-500 transition-colors">Rooms Gallery</button></li>
              <li><button onClick={() => onNavigateHome('contact')} className="hover:text-orange-500 transition-colors">Contact & Map</button></li>
              <li><button onClick={() => onNavigateHome('contact')} className="hover:text-orange-500 transition-colors">Book Now</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xl mb-8 uppercase tracking-widest text-orange-500">Connect</h4>
            <div className="flex gap-4 mb-10">
               <a href="#" className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center hover:bg-orange-600 transition-all font-bold">FB</a>
               <a href="#" className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center hover:bg-orange-600 transition-all font-bold">IG</a>
               <a href="#" className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center hover:bg-orange-600 transition-all font-bold">WA</a>
            </div>
            <p className="text-slate-400 text-sm leading-loose">
              Baccuit Norte, Bauang,<br />
              La Union, Philippines, 2501<br />
              <span className="text-orange-500/50">Reg No: 2019-GW-RT-42</span>
            </p>
          </div>
        </div>
        
        <div className="mt-16 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Gateway Resort & Restobar. All rights reserved.</p>
          <p className="mt-4 text-xs opacity-50 uppercase tracking-widest">Designed for high-performance & SEO excellence.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
