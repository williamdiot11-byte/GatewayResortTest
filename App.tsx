
import React, { useState } from 'react';
import Header from './components/Header.tsx';
import Hero from './components/Hero.tsx';
import Amenities from './components/Amenities.tsx';
import Accommodations from './components/Accommodations.tsx';
import Contact from './components/Contact.tsx';
import Footer from './components/Footer.tsx';
import RoomsGallery from './components/RoomsGallery.tsx';
import InquirePage from './components/InquirePage.tsx';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'gallery' | 'inquire'>('home');

  const navigateToHome = (sectionId?: string) => {
    setCurrentView('home');
    if (sectionId) {
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          const yOffset = -80; 
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigateToGallery = () => {
    setCurrentView('gallery');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToInquire = () => {
    setCurrentView('inquire');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="selection:bg-orange-200">
      <Header 
        onNavigateHome={navigateToHome} 
        onNavigateGallery={navigateToGallery} 
        currentView={currentView === 'gallery' ? 'gallery' : 'home'}
      />
      
      <main>
        {currentView === 'home' && (
          <>
            <Hero onExploreRooms={navigateToGallery} onInquireNow={navigateToInquire} />
            <Amenities onSeeRooms={navigateToGallery} />
            <Accommodations onExploreMore={navigateToGallery} />
            <Contact />
            <Footer onNavigateHome={navigateToHome} />
          </>
        )}
        
        {currentView === 'gallery' && (
          <div className="pt-24 bg-cozy min-h-screen">
            <RoomsGallery />
            <Footer onNavigateHome={navigateToHome} />
          </div>
        )}

        {currentView === 'inquire' && (
          <div className="pt-24 bg-cozy min-h-screen">
            <InquirePage onBack={() => navigateToHome()} />
            <Footer onNavigateHome={navigateToHome} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
