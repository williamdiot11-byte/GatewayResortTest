
import React, { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import Header from './components/Header.tsx';
import Hero from './components/Hero.tsx';
import Amenities from './components/Amenities.tsx';
import Accommodations from './components/Accommodations.tsx';
import Contact from './components/Contact.tsx';
import Footer from './components/Footer.tsx';
import RoomsGallery from './components/RoomsGallery.tsx';
import InquirePage from './components/InquirePage.tsx';
import BookingPage from './components/BookingPage.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import { User } from './types';
import { useSupabaseClient } from './hooks/useSupabaseClient';

const App: React.FC = () => {
  const { user: clerkUser, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const supabase = useSupabaseClient();
  const [currentView, setCurrentView] = useState<'home' | 'gallery' | 'inquire' | 'booking' | 'admin'>('home');
  const [appUser, setAppUser] = useState<User | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // ── Clerk → Supabase profile sync ───────────────────────────────
  useEffect(() => {
    if (isSignedIn && clerkUser) {
      syncClerkUserToSupabase();
    } else {
      setAppUser(null);
    }
  }, [isSignedIn, clerkUser]);

  const syncClerkUserToSupabase = async () => {
    if (!clerkUser) return;

    // Upsert profile — creates it on first sign-in (no webhook needed on localhost)
    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        full_name: clerkUser.fullName || '',
      }, { onConflict: 'id' })
      .select('full_name, role')
      .single();

    if (error) console.error('Supabase sync error:', error);

    setAppUser({
      id: clerkUser.id,
      name: profile?.full_name || clerkUser.fullName || clerkUser.primaryEmailAddress?.emailAddress || 'Guest',
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
      role: profile?.role === 'admin' ? 'admin' : 'user',
    });
  };

  const handleSignOut = async () => {
    await signOut();
    setAppUser(null);
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const handleReserve = (roomId: string) => {
    setSelectedRoomId(roomId);
    setCurrentView('booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToAdmin = () => {
    if (appUser?.role === 'admin') {
      setCurrentView('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="selection:bg-orange-200">
      <Header 
        onNavigateHome={navigateToHome} 
        onNavigateGallery={navigateToGallery}
        onSignOut={handleSignOut}
        onNavigateLogin={() => {}}
        onNavigateAdmin={navigateToAdmin}
        currentView={currentView === 'admin' ? 'admin' : currentView === 'gallery' ? 'gallery' : 'home'}
        user={appUser}
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
            <InquirePage onBack={() => navigateToHome()} user={appUser} />
            <Footer onNavigateHome={navigateToHome} />
          </div>
        )}

        {currentView === 'booking' && selectedRoomId && (
          <div className="pt-32 bg-cozy min-h-screen">
            <BookingPage 
              roomId={selectedRoomId} 
              onBack={() => setCurrentView('gallery')} 
            />
            <Footer onNavigateHome={navigateToHome} />
          </div>
        )}

        {currentView === 'admin' && (
          <div className="pt-32 bg-cozy min-h-screen">
            {appUser?.role === 'admin' ? (
              <AdminDashboard onBack={() => navigateToHome()} />
            ) : (
              <div className="max-w-7xl mx-auto px-4 py-24 text-center">
                <h1 className="text-4xl font-serif font-black text-slate-900 mb-4">Access Denied</h1>
                <p className="text-slate-600 mb-8">You do not have permission to view this page.</p>
                <button 
                  onClick={() => navigateToHome()}
                  className="px-8 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition-colors"
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
