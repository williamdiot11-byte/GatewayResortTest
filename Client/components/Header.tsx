
import React, { useState, useEffect } from 'react';
import { Phone, ShieldCheck } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  onNavigateHome: (sectionId?: string) => void;
  onNavigateGallery: () => void;
  onNavigateAdmin: () => void;
  currentView: 'home' | 'gallery' | 'admin';
  user: User | null;
}

const Header: React.FC<HeaderProps> = ({ onNavigateHome, onNavigateGallery, onNavigateAdmin, currentView, user }) => {
  const [activeSection, setActiveSection] = useState<string>('home');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'amenities', 'rooms', 'contact'];
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 200) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (id: string) => {
    if (id === 'rooms' && currentView !== 'gallery') {
      onNavigateGallery();
    } else {
      onNavigateHome(id);
    }
  };

  const navLinks = [
    { id: 'amenities', label: 'Amenities' },
    { id: 'rooms', label: 'Rooms' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <>
      <style>
        {`
          @keyframes shootingStar {
            0% { offset-distance: 0%; opacity: 0; filter: blur(0px); }
            15% { opacity: 1; filter: blur(1px); }
            85% { opacity: 1; filter: blur(1px); }
            100% { offset-distance: 100%; opacity: 0; filter: blur(2px); }
          }
          .shooting-star-particle {
            offset-path: path('M 0 30 Q 25 -10 50 30 T 100 30');
            offset-rotate: auto;
            position: absolute;
            pointer-events: none;
            opacity: 0;
            z-index: 20;
          }
          .group:hover .shooting-star-particle {
            animation: shootingStar 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
        `}
      </style>
      <header className="fixed top-0 w-full z-[100] py-8 bg-transparent transition-all duration-500">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 flex justify-between items-center">
          
          {/* Star Logo - Remains White */}
          <div onClick={() => onNavigateHome()} className="group relative cursor-pointer p-1">
            <div className="shooting-star-particle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L14.5 9H22L16 14L18.5 21L12 17L5.5 21L8 14L2 9H9.5L12 2Z" fill="#FBBF24" className="drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              </svg>
            </div>
            <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm transition-transform duration-500 group-hover:scale-105 relative z-10">
              <path d="M50 10C52 10 54 25 58 35C62 45 85 46 88 50C91 54 75 62 70 70C65 78 72 90 65 94C58 98 52 85 50 85C48 85 42 98 35 94C28 90 35 78 30 70C25 62 9 54 12 50C15 46 38 45 42 35C46 25 48 10 50 10Z" fill="#ffffff" />
              <circle cx="43" cy="52" r="3" fill="#0f172a" />
              <path d="M54 52C55 51 58 51 59 52" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
              <path d="M47 62C48 64 52 64 53 62" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          
          <nav className="hidden md:flex space-x-12 lg:space-x-16 items-center">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`relative py-2 text-[10px] font-black tracking-[0.4em] uppercase transition-all duration-500 ${
                  (activeSection === link.id || (link.id === 'rooms' && currentView === 'gallery')) 
                  ? 'text-orange-600' 
                  : 'text-slate-900 hover:text-orange-600'
                }`}
              >
                {link.label}
                <span className={`absolute bottom-0 left-0 h-[2.5px] bg-orange-600 transition-all duration-500 ${(activeSection === link.id || (link.id === 'rooms' && currentView === 'gallery')) ? 'w-full opacity-100' : 'w-0 opacity-0'}`} />
              </button>
            ))}
            
            {user?.role === 'admin' && (
              <button
                onClick={onNavigateAdmin}
                className={`flex items-center gap-2 py-2 text-[10px] font-black tracking-[0.4em] uppercase transition-all duration-500 ${
                  currentView === 'admin' ? 'text-orange-600' : 'text-slate-900 hover:text-orange-600'
                }`}
              >
                <ShieldCheck size={14} />
                Admin
              </button>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {/* Mobile Admin Button */}
            {user?.role === 'admin' && (
              <button
                onClick={onNavigateAdmin}
                className="md:hidden p-2 text-slate-900 hover:text-orange-600 transition-colors"
                title="Admin Dashboard"
              >
                <ShieldCheck size={20} />
              </button>
            )}

            <a
              href="tel:09398449670"
              className="px-8 py-3 rounded-full font-black text-[9px] tracking-[0.3em] uppercase bg-white/10 backdrop-blur-md border border-white/20 text-slate-900 hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all shadow-sm"
            >
              <Phone size={12} className="inline mr-2.5 mb-0.5" />
              Book Now
            </a>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
