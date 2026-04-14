
import React, { useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import Cal, { getCalApi } from "@calcom/embed-react";
import { ArrowLeft } from 'lucide-react';

interface BookingPageProps {
  roomId: string;
  onBack: () => void;
}

interface ResolveBookingOptions {
  emailOverride?: string;
  clientBookingRefOverride?: string;
}

const BookingPage: React.FC<BookingPageProps> = ({ roomId, onBack }) => {
  const { user } = useUser();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
  const calLink = import.meta.env.VITE_CAL_BOOKING_LINK || 'william-diot-fbbkje/30min';
  const [contactEmail, setContactEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('gateway_booking_contact_email');
      if (saved && saved.trim()) {
        return saved.trim();
      }
    }
    return user?.primaryEmailAddress?.emailAddress || '';
  });
  const [clientBookingRef] = useState(() => {
    if (typeof window !== 'undefined' && typeof window.crypto?.randomUUID === 'function') {
      return `gr-${roomId}-${window.crypto.randomUUID()}`;
    }

    return `gr-${roomId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<'online' | 'counter' | null>(null);
  const [resolvedBookingId, setResolvedBookingId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isCounterConfirmed, setIsCounterConfirmed] = useState(false);
  const latestContactEmailRef = useRef(contactEmail);
  const latestUserRef = useRef(user);

  useEffect(() => {
    latestContactEmailRef.current = contactEmail;
  }, [contactEmail]);

  useEffect(() => {
    latestUserRef.current = user;
  }, [user]);

  useEffect(() => {
    const normalized = contactEmail.trim();
    if (typeof window !== 'undefined' && normalized) {
      window.localStorage.setItem('gateway_booking_contact_email', normalized);
    }
  }, [contactEmail]);

  const extractCalBookingDetails = (event: any): { bookingId: string | null; email: string | null } => {
    const bookingIdCandidates = [
      event?.data?.booking?.uid,
      event?.detail?.booking?.uid,
      event?.data?.uid,
      event?.detail?.uid,
      event?.data?.bookingUid,
      event?.detail?.bookingUid,
      event?.data?.bookingId,
      event?.detail?.bookingId,
      event?.booking?.uid,
      event?.uid,
      event?.data?.payload?.uid,
      event?.detail?.payload?.uid,
    ];

    const emailCandidates = [
      event?.data?.email,
      event?.detail?.email,
      event?.data?.booking?.email,
      event?.detail?.booking?.email,
      event?.data?.payload?.email,
      event?.detail?.payload?.email,
      event?.data?.attendees?.[0]?.email,
      event?.detail?.attendees?.[0]?.email,
      event?.data?.payload?.attendees?.[0]?.email,
      event?.detail?.payload?.attendees?.[0]?.email,
    ];

    const bookingId = bookingIdCandidates.find((value) => typeof value === 'string' && value.trim()) || null;
    const email = emailCandidates.find((value) => typeof value === 'string' && value.trim()) || null;

    return {
      bookingId: typeof bookingId === 'string' ? bookingId.trim() : null,
      email: typeof email === 'string' ? email.trim() : null,
    };
  };

  const registerBookingFromEvent = async (bookingId?: string | null, emailOverride?: string): Promise<string | null> => {
    const normalizedBookingId = typeof bookingId === 'string' ? bookingId.trim() : '';
    const fallbackEmail = (emailOverride || latestContactEmailRef.current).trim().toLowerCase();
    if (!fallbackEmail) {
      return null;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/payments/register-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: normalizedBookingId || undefined,
          clientBookingRef,
          roomId,
          email: fallbackEmail,
          clerkUserId: latestUserRef.current?.id || null,
          userName: latestUserRef.current?.fullName || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (import.meta.env.DEV) {
          console.warn('register-booking fallback failed', {
            status: response.status,
            error: payload?.error || null,
            bookingId: normalizedBookingId || null,
            clientBookingRef,
            roomId,
            email: fallbackEmail,
          });
        }
        return null;
      }

      const payload = await response.json().catch(() => ({}));
      return typeof payload?.bookingId === 'string' && payload.bookingId ? payload.bookingId : normalizedBookingId || null;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('register-booking fallback request error', {
          error,
          bookingId: normalizedBookingId || null,
          clientBookingRef,
          roomId,
          email: fallbackEmail,
        });
      }
      return null;
    }
  };

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      setContactEmail(user.primaryEmailAddress.emailAddress);
    }
  }, [user]);

  useEffect(() => {
    (async function () {
      const cal = await getCalApi();
      cal("ui", {
        theme: "light",
        styles: {
          branding: {
            brandColor: "#EA580C",
          },
        },
        hideEventTypeDetails: true,
        layout: "month_view",
      });

      cal('on', {
        action: 'bookingSuccessful',
        callback: async (event: any) => {
          const { bookingId: bookingIdFromEvent, email: emailFromEvent } = extractCalBookingDetails(event);

          if (import.meta.env.DEV) {
            console.log('Cal bookingSuccessful payload parsed', {
              bookingIdFromEvent,
              clientBookingRef,
              emailFromEvent,
              roomId,
              hasData: !!event?.data,
              hasDetail: !!event?.detail,
            });
          }

          if (emailFromEvent) {
            setContactEmail(emailFromEvent);
          }

          setShowPaymentModal(true);
          setPaymentMessage('Reservation received. Preparing payment options...');

          if (typeof bookingIdFromEvent === 'string' && bookingIdFromEvent) {
            const registeredBookingId = await registerBookingFromEvent(
              bookingIdFromEvent,
              emailFromEvent || latestContactEmailRef.current
            );
            const effectiveBookingId = registeredBookingId || bookingIdFromEvent;
            setResolvedBookingId(effectiveBookingId);
            setPaymentMessage(
              registeredBookingId
                ? 'Reservation confirmed. Choose your payment option below.'
                : 'Reservation confirmed. We are syncing your booking details now. If needed, retry in a few seconds.'
            );
            return;
          }

          const fallbackEmail = emailFromEvent || latestContactEmailRef.current;
          if (fallbackEmail || clientBookingRef) {
            const found = await resolveLatestBookingId({
              emailOverride: fallbackEmail || undefined,
              clientBookingRefOverride: clientBookingRef,
            });
            if (!found) {
              setPaymentMessage('Booking confirmed, but we are still syncing details. Please wait a few seconds and try again.');
            }
          }
        },
      });
    })();
  }, []);

  const resolveLatestBookingId = async (options?: ResolveBookingOptions): Promise<string | null> => {
    const lookupEmail = (options?.emailOverride || contactEmail).trim();
    const lookupClientBookingRef = (options?.clientBookingRefOverride || clientBookingRef).trim();
    if (!lookupEmail && !lookupClientBookingRef) {
      setPaymentMessage('Add your email address first so we can locate your booking.');
      return null;
    }

    try {
      setLookupLoading(true);
      setPaymentMessage('Looking up your latest reservation...');

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const response = await fetch(`${apiBaseUrl}/api/payments/resolve-latest-booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId,
            email: lookupEmail || undefined,
            clientBookingRef: lookupClientBookingRef || undefined,
            clerkUserId: user?.id || null,
          }),
        });

        if (response.status === 404) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load booking. Please try again in a few seconds.');
        }

        if (payload?.bookingId) {
          setResolvedBookingId(payload.bookingId);
          setPaymentMessage('Reservation confirmed. Choose your payment option below.');
          return payload.bookingId;
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      const fallbackBookingId = await registerBookingFromEvent(undefined, lookupEmail || undefined);
      if (fallbackBookingId) {
        setResolvedBookingId(fallbackBookingId);
        setPaymentMessage('Reservation synced. Choose your payment option below.');
        return fallbackBookingId;
      }

      setPaymentMessage('No booking found yet. Please wait a moment, then try again.');
      setResolvedBookingId(null);
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to locate your reservation.';
      setPaymentMessage(message);
      setResolvedBookingId(null);
      return null;
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePayNow = async () => {
    try {
      setPaymentLoading(true);
      setSelectedPaymentOption('online');

      const bookingId = resolvedBookingId || (await resolveLatestBookingId());
      if (!bookingId) {
        return;
      }

      const amount = Number(import.meta.env.VITE_DEFAULT_BOOKING_AMOUNT || 3000);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Invalid payment amount configuration.');
      }

      const response = await fetch(`${apiBaseUrl}/api/payments/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          amount,
          currency: 'usd',
          customerEmail: contactEmail.trim(),
          roomLabel: `Gateway Resort room ${roomId}`,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.checkoutUrl) {
        throw new Error(payload?.error || 'Unable to create checkout session.');
      }

      window.location.href = payload.checkoutUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start payment flow.';
      setPaymentMessage(message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePayAtCounter = async () => {
    setSelectedPaymentOption('counter');
    setPaymentLoading(true);

    try {
      const bookingId = resolvedBookingId || (await resolveLatestBookingId());
      if (!bookingId) {
        return;
      }

      const response = await fetch(`${apiBaseUrl}/api/payments/mark-counter-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          customerEmail: contactEmail.trim().toLowerCase(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save pay-at-counter preference.');
      }

      setIsCounterConfirmed(true);
      setPaymentMessage('Pay at counter selected. Please confirm your booking from the email we send you.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save pay-at-counter preference.';
      setPaymentMessage(message);
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
      <div className="mb-12 flex items-center justify-between">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-orange-600 transition-colors mb-6 font-bold uppercase tracking-widest text-[10px]"
          >
            <ArrowLeft size={16} />
            Back to Collection
          </button>
          <h1 className="text-5xl font-serif font-black text-slate-900">Finalize Your Stay</h1>
          <p className="text-slate-600 mt-4 italic text-lg">
            Booking for: <span className="text-orange-600 font-bold not-italic">{roomId.replace(/-/g, ' ').toUpperCase()}</span>
          </p>
        </div>
        {user && (
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Authenticated as</p>
            <p className="text-slate-900 font-bold">{user.fullName || 'Guest'}</p>
            <p className="text-slate-500 text-sm">{user.primaryEmailAddress?.emailAddress}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl shadow-orange-900/5 border border-orange-100 overflow-hidden min-h-[700px]">
        <Cal
          calLink={calLink}
          style={{ width: "100%", height: "100%", minHeight: "700px" }}
          config={{
            name: user?.fullName || '',
            email: user?.primaryEmailAddress?.emailAddress || '',
            notes: `Reservation request for room reference: ${roomId}`,
            theme: "light",
            metadata: {
              clerkUserId: user?.id || '',
              roomId: roomId,
              clientBookingRef,
            }
          }}
        />
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-orange-100 shadow-2xl p-7">
            <h2 className="text-2xl font-serif font-black text-slate-900">Choose Your Payment Option</h2>
            <p className="text-slate-600 text-sm mt-2">
              Your reservation is awaiting email confirmation.
            </p>

            <div className="space-y-2 text-orange-900 mt-4">
              <p className="text-sm">
                We will hold your room until 6:00 PM on arrival day if it is not confirmed.
              </p>
              <p className="text-sm">
                After 6:00 PM, unconfirmed reservations may be released.
              </p>
              <p className="text-sm">
                No cancellation fee is charged.
              </p>
            </div>

            <div className="mt-5">
              <label htmlFor="payment-email" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Confirmation Email
              </label>
              <input
                id="payment-email"
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full px-4 py-2 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handlePayNow}
                disabled={paymentLoading || lookupLoading || isCounterConfirmed}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {paymentLoading && selectedPaymentOption === 'online' ? 'Starting Payment...' : 'Pay Now'}
              </button>

              <button
                onClick={handlePayAtCounter}
                disabled={paymentLoading || lookupLoading || isCounterConfirmed}
                className="px-6 py-3 bg-white text-slate-900 border border-slate-300 rounded-lg font-bold hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Pay at Counter
              </button>
            </div>

            {isCounterConfirmed && (
              <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                Pay-at-counter saved. Your room is now waiting for email confirmation.
              </div>
            )}

            {paymentMessage && (
              <p className="mt-4 text-sm text-slate-700">{paymentMessage}</p>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                {isCounterConfirmed ? "I'll Confirm by Email" : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingPage;
