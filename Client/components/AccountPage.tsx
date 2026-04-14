import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, CreditCard, Loader } from 'lucide-react';
import { useSupabaseClient } from '../hooks/useSupabaseClient';
import { User } from '../types';

type PaymentReturnState = {
  status: 'success' | 'cancelled';
  bookingId: string | null;
  dismissedAt?: string;
};

interface BookingRecord {
  id: string;
  booking_id: string;
  user_id: string | null;
  user_email: string;
  room_id: string | null;
  booking_date: string | null;
  created_at: string;
  metadata?: {
    paymentStatus?: string;
    paymentOption?: string;
    bookingStatus?: string;
    confirmationEmailStatus?: string;
  };
}

interface AccountPageProps {
  user: User | null;
  onBack: () => void;
}

const AccountPage: React.FC<AccountPageProps> = ({ user, onBack }) => {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [lastPaymentUpdate, setLastPaymentUpdate] = useState<PaymentReturnState | null>(null);

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('gateway_last_payment_return') : null;
    if (!raw) {
      setLastPaymentUpdate(null);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PaymentReturnState;
      if (parsed?.status === 'success' || parsed?.status === 'cancelled') {
        setLastPaymentUpdate(parsed);
      }
    } catch {
      setLastPaymentUpdate(null);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [user?.id, user?.email]);

  const loadBookings = async () => {
    if (!user) {
      setLoading(false);
      setBookings([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const byUserId = await supabase
        .from('booking_metadata')
        .select('id, booking_id, user_id, user_email, room_id, booking_date, created_at, metadata')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (byUserId.error) {
        throw byUserId.error;
      }

      const byEmail = await supabase
        .from('booking_metadata')
        .select('id, booking_id, user_id, user_email, room_id, booking_date, created_at, metadata')
        .eq('user_email', user.email.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(50);

      if (byEmail.error) {
        throw byEmail.error;
      }

      const merged = [...(byUserId.data || []), ...(byEmail.data || [])];
      const dedupedMap = new Map<string, BookingRecord>();
      for (const row of merged) {
        if (!row?.booking_id) {
          continue;
        }

        const existing = dedupedMap.get(row.booking_id);
        if (!existing || new Date(row.created_at).getTime() > new Date(existing.created_at).getTime()) {
          dedupedMap.set(row.booking_id, row as BookingRecord);
        }
      }

      const sorted = Array.from(dedupedMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setBookings(sorted);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load booking history.';
      setError(message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) {
      return 'Not set';
    }

    try {
      return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return value;
    }
  };

  const formatStatus = (raw: string | undefined, fallback = 'pending') => {
    const value = raw || fallback;
    return value.replace(/_/g, ' ');
  };

  const bookingCountLabel = useMemo(() => {
    if (loading) {
      return 'Loading...';
    }

    return `${bookings.length} booking${bookings.length === 1 ? '' : 's'}`;
  }, [bookings.length, loading]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
      <div className="mb-10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-orange-600 transition-colors mb-6 font-bold uppercase tracking-widest text-[10px]"
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>
        <h1 className="text-4xl md:text-5xl font-serif font-black text-slate-900">Your Account</h1>
        <p className="text-slate-600 mt-3">Track your latest reservation and payment updates.</p>
      </div>

      {lastPaymentUpdate && (
        <div
          className={`mb-6 rounded-2xl border px-5 py-4 ${
            lastPaymentUpdate.status === 'success'
              ? 'bg-emerald-50 border-emerald-300'
              : 'bg-amber-50 border-amber-300'
          }`}
        >
          <p
            className={`text-sm md:text-base font-bold ${
              lastPaymentUpdate.status === 'success' ? 'text-emerald-900' : 'text-amber-900'
            }`}
          >
            {lastPaymentUpdate.status === 'success'
              ? 'Your latest payment was successful.'
              : 'Your latest payment was cancelled.'}
          </p>
          <p className="text-xs text-slate-700 mt-1">
            {lastPaymentUpdate.bookingId
              ? `Latest booking reference: ${lastPaymentUpdate.bookingId}`
              : 'No booking id available for this payment update.'}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-orange-600" />
            <h2 className="text-lg font-black text-slate-900">Bookings</h2>
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500" aria-live="polite">{bookingCountLabel}</span>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <div className="py-10 text-center text-slate-600" role="status" aria-live="polite">
              <Loader size={24} className="animate-spin mx-auto mb-3 text-orange-600" />
              Loading booking history...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-rose-800 text-sm" role="alert">
              {error}
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-sm text-slate-600 py-6">No bookings found for your account yet.</p>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div key={booking.id} className="rounded-xl border border-slate-200 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900">{booking.room_id || 'Room pending assignment'}</p>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700">
                      <CreditCard size={12} />
                      {formatStatus(booking.metadata?.paymentStatus, 'unpaid')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2">Booking ID: {booking.booking_id}</p>
                  <p className="text-xs text-slate-600">When: {formatDate(booking.booking_date || booking.created_at)}</p>
                  <p className="text-xs text-slate-600">Payment Option: {formatStatus(booking.metadata?.paymentOption, 'not selected')}</p>
                  <p className="text-xs text-slate-600">Confirmation Email: {formatStatus(booking.metadata?.confirmationEmailStatus, 'unknown')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
