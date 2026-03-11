
import React, { useState } from 'react';
import Header from './components/Header.tsx';
import Hero from './components/Hero.tsx';
import Amenities from './components/Amenities.tsx';
import Accommodations from './components/Accommodations.tsx';
import Contact from './components/Contact.tsx';
import Footer from './components/Footer.tsx';
import RoomsGallery from './components/RoomsGallery.tsx';
import InquirePage from './components/InquirePage.tsx';
import BookingPage from './components/BookingPage.tsx';
import LoginPage from './components/LoginPage.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import { User } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'gallery' | 'inquire' | 'booking' | 'login' | 'admin'>('home');
  const [user, setUser] = useState<User | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Editor Bypass Logic
  const isDevMode = process.env.NODE_ENV === 'development';

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

  const navigateToAdmin = () => {
    // Editor Exception Bypass for development mode
    if (isDevMode) {
      console.log('Dev Mode: Bypassing authentication for admin access');
      if (!user) {
        setUser({
          id: 'dev-admin',
          name: 'Developer Admin',
          email: 'admin@gatewayresort.com',
          role: 'admin'
        });
      }
      setCurrentView('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (user?.role === 'admin') {
      setCurrentView('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setCurrentView('login');
    }
  };

  const handleReserve = (roomId: string) => {
    setSelectedRoomId(roomId);
    
    // Editor Exception Bypass
    if (isDevMode) {
      console.log('Dev Mode: Bypassing authentication for reservation');
      // Simulate a logged in user if none exists
      if (!user) {
        setUser({
          id: 'dev-user',
          name: 'Developer User',
          email: 'dev@gatewayresort.com',
          role: 'admin'
        });
      }
      setCurrentView('booking');
    } else {
      if (!user) {
        setCurrentView('login');
      } else {
        setCurrentView('booking');
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    if (selectedRoomId) {
      setCurrentView('booking');
    } else {
      setCurrentView('home');
    }
  };

  return (
    <div className="selection:bg-orange-200">
      <Header 
        onNavigateHome={navigateToHome} 
        onNavigateGallery={navigateToGallery} 
        onNavigateAdmin={navigateToAdmin}
        currentView={currentView === 'gallery' ? 'gallery' : currentView === 'admin' ? 'admin' : 'home'}
        user={user}
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
            <RoomsGallery onReserve={handleReserve} />
            <Footer onNavigateHome={navigateToHome} />
          </div>
        )}

        {currentView === 'inquire' && (
          <div className="pt-24 bg-cozy min-h-screen">
            <InquirePage onBack={() => navigateToHome()} user={user} />
            <Footer onNavigateHome={navigateToHome} />
          </div>
        )}

        {currentView === 'login' && (
          <div className="pt-40 bg-cozy min-h-screen">
            <LoginPage onLogin={handleLogin} onBack={() => setCurrentView('gallery')} />
            <Footer onNavigateHome={navigateToHome} />
          </div>
        )}

        {currentView === 'booking' && user && selectedRoomId && (
          <div className="pt-32 bg-cozy min-h-screen">
            <BookingPage 
              user={user} 
              roomId={selectedRoomId} 
              onBack={() => setCurrentView('gallery')} 
            />
            <Footer onNavigateHome={navigateToHome} />
          </div>
        )}

        {currentView === 'admin' && (
          <div className="pt-32 bg-cozy min-h-screen">
            {user?.role === 'admin' ? (
              <AdminDashboard />
            ) : (
              <div className="max-w-md mx-auto text-center py-20">
                <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">Access Denied</h2>
                <p className="text-slate-600 mb-8">You do not have permission to view this page.</p>
                <button 
                  onClick={() => setCurrentView('home')}
                  className="px-8 py-3 bg-orange-600 text-white rounded-xl font-bold"
                >
                  Return Home
                </button>
              </div>
            )}
            <Footer onNavigateHome={navigateToHome} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
