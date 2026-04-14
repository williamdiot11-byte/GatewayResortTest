
import React, { useState, useEffect, useRef } from 'react';
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
import AccountPage from './components/AccountPage.tsx';
import { User } from './types';
import { useSupabaseClient } from './hooks/useSupabaseClient';

type PaymentReturnState = {
  status: 'success' | 'cancelled';
  bookingId: string | null;
};

const App: React.FC = () => {
  const { user: clerkUser, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const supabase = useSupabaseClient();
  const [currentView, setCurrentView] = useState<'home' | 'gallery' | 'inquire' | 'booking' | 'admin' | 'account'>('home');
  const [appUser, setAppUser] = useState<User | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [paymentReturnState, setPaymentReturnState] = useState<PaymentReturnState | null>(null);
  const paymentReturnDismissButtonRef = useRef<HTMLButtonElement | null>(null);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentParam = params.get('payment');
    const bookingIdParam = params.get('bookingId');

    if (paymentParam === 'success' || paymentParam === 'cancelled') {
      setPaymentReturnState({
        status: paymentParam,
        bookingId: bookingIdParam,
      });
      setCurrentView('home');

      params.delete('payment');
      params.delete('bookingId');
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

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

  const navigateToAccount = () => {
    if (!appUser) {
      return;
    }

    setCurrentView('account');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const dismissPaymentReturnBanner = () => {
    if (paymentReturnState && typeof window !== 'undefined') {
      window.localStorage.setItem(
        'gateway_last_payment_return',
        JSON.stringify({
          ...paymentReturnState,
          dismissedAt: new Date().toISOString(),
        })
      );
    }

    setPaymentReturnState(null);
  };

  useEffect(() => {
    if (!paymentReturnState) {
      return;
    }

    paymentReturnDismissButtonRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismissPaymentReturnBanner();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [paymentReturnState]);

  const headerView: 'home' | 'gallery' | 'admin' =
    currentView === 'admin' ? 'admin' : currentView === 'gallery' ? 'gallery' : 'home';

  return (
    <div className="selection:bg-orange-200">
      <Header 
        onNavigateHome={navigateToHome} 
        onNavigateGallery={navigateToGallery}
        onSignOut={handleSignOut}
        onNavigateLogin={() => {}}
        onNavigateAdmin={navigateToAdmin}
        onNavigateAccount={navigateToAccount}
        currentView={headerView}
        user={appUser}
      />
      
      <main>
        {paymentReturnState && (
          <div className="fixed inset-0 z-[110] bg-slate-900/45 backdrop-blur-[2px] flex items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="payment-return-title"
              aria-describedby="payment-return-description"
              className={`w-full max-w-2xl rounded-3xl border px-6 py-6 md:px-7 md:py-7 shadow-2xl ${
                paymentReturnState.status === 'success'
                  ? 'bg-gradient-to-br from-emerald-50 via-white to-emerald-100 border-emerald-300'
                  : 'bg-gradient-to-br from-amber-50 via-white to-amber-100 border-amber-300'
              }`}
            >
              <div>
                <p
                  id="payment-return-title"
                  className={`text-xl md:text-2xl font-serif font-black ${
                    paymentReturnState.status === 'success' ? 'text-emerald-900' : 'text-amber-900'
                  }`}
                >
                  {paymentReturnState.status === 'success'
                    ? 'Payment successful. Your booking is confirmed.'
                    : 'Payment was cancelled. Your booking remains pending.'}
                </p>
                <p id="payment-return-description" className="text-sm text-slate-700 mt-2">
                  {paymentReturnState.bookingId
                    ? `Booking ID: ${paymentReturnState.bookingId}`
                    : 'You can continue from the booking flow at any time.'}
                </p>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 mt-4">
                  This update is also saved in your account section.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 mt-5">
                {appUser && (
                  <button
                    type="button"
                    onClick={() => {
                      dismissPaymentReturnBanner();
                      navigateToAccount();
                    }}
                    className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold uppercase tracking-[0.14em] hover:bg-slate-50 transition-colors"
                  >
                    Open Account
                  </button>
                )}
                <button
                  type="button"
                  onClick={navigateToGallery}
                  className="px-4 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold uppercase tracking-[0.14em] hover:bg-orange-700 transition-colors"
                >
                  View Rooms
                </button>
                <button
                  ref={paymentReturnDismissButtonRef}
                  type="button"
                  onClick={dismissPaymentReturnBanner}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold uppercase tracking-[0.14em] hover:bg-slate-50 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

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
                  type="button"
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

        {currentView === 'account' && (
          <div className="pt-32 bg-cozy min-h-screen">
            <AccountPage user={appUser} onBack={() => navigateToHome()} />
            <Footer onNavigateHome={navigateToHome} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
