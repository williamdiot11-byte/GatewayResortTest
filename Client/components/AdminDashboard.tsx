import React, { useState, useEffect } from 'react';
import { useSupabaseClient } from '../hooks/useSupabaseClient';
import { ArrowLeft, Calendar, User, Mail, ExternalLink, Loader, Search } from 'lucide-react';

interface BookingRecord {
  id: string;
  booking_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  room_id: string;
  booking_date: string;
  event_id?: string;
  created_at: string;
  metadata?: {
    paymentStatus?: string;
  };
}

interface AdminDashboardProps {
  onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const supabase = useSupabaseClient();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('booking_metadata')
        .select('*')
        .order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      setBookings(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load bookings';
      setError(errorMessage);
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const getPaymentStatus = (booking: BookingRecord) => {
    return booking.metadata?.paymentStatus || 'unpaid';
  };

  const formatPaymentStatusLabel = (paymentStatus: string) => {
    if (paymentStatus === 'pending_counter') {
      return 'counter pending';
    }

    return paymentStatus.replace(/_/g, ' ');
  };

  const getPaymentBadgeClasses = (paymentStatus: string) => {
    if (paymentStatus === 'paid') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }

    if (paymentStatus === 'pending') {
      return 'bg-amber-100 text-amber-800 border-amber-300';
    }

    if (paymentStatus === 'pending_counter') {
      return 'bg-sky-100 text-sky-800 border-sky-300';
    }

    if (paymentStatus === 'failed') {
      return 'bg-rose-100 text-rose-800 border-rose-300';
    }

    if (paymentStatus === 'refunded') {
      return 'bg-slate-200 text-slate-800 border-slate-400';
    }

    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  const filteredBookings = bookings.filter((booking) => {
    if (!normalizedSearch) {
      return true;
    }

    const searchable = [
      booking.booking_id,
      booking.user_name,
      booking.user_email,
      booking.room_id,
      booking.booking_date,
    ]
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalizedSearch);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
      {/* Header */}
      <div className="mb-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-orange-600 transition-colors mb-6 font-bold uppercase tracking-widest text-[10px]"
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>
        <h1 className="text-5xl font-serif font-black text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-600 mt-4">Manage bookings and view booking history from Cal.com</p>
      </div>

      {/* Bookings Section */}
      <div className="bg-slate-100 rounded-[2rem] shadow-xl shadow-slate-900/10 border border-slate-300 overflow-hidden">
        {/* Section Header */}
        <div className="border-b border-slate-300 px-6 py-5 bg-slate-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-serif font-black text-white flex items-center gap-3">
                <Calendar size={24} className="text-orange-400" />
                Booking History
              </h2>
              {!loading && bookings.length > 0 && (
                <p className="text-slate-300 text-xs mt-2">
                  Showing {filteredBookings.length} of {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="relative w-full lg:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID, email, guest, room..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-slate-100 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader size={40} className="text-orange-600 mb-4 animate-spin" />
              <p className="text-slate-600">Loading bookings...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="font-bold text-red-900 mb-2">Error Loading Bookings</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={fetchBookings}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">No bookings yet</p>
              <p className="text-slate-400 text-sm mt-2">Bookings from Cal.com will appear here when created</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Search size={44} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg">No matching bookings</p>
              <p className="text-slate-500 text-sm mt-2">Try a different search keyword</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[46rem] overflow-y-auto pr-1">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="border border-slate-300 rounded-lg p-3 hover:border-orange-400 hover:shadow-sm transition-all bg-white"
                >
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1.2fr_1.2fr_0.8fr_1fr_auto] lg:items-center">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <User size={14} className="text-orange-600 flex-shrink-0" />
                      <p className="font-bold text-sm text-slate-900 truncate">{booking.user_name || 'Unknown Guest'}</p>
                    </div>

                    <div className="flex items-center gap-2.5 min-w-0">
                      <Mail size={14} className="text-orange-600 flex-shrink-0" />
                      <p className="text-sm text-slate-800 truncate">{booking.user_email || 'No email'}</p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Room</p>
                      <p className="font-bold text-sm text-slate-900 truncate">{booking.room_id || 'Not specified'}</p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">When</p>
                      <p className="font-semibold text-sm text-slate-900 truncate">{formatDate(booking.booking_date)}</p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Payment</p>
                      <span
                        className={`inline-flex mt-1 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-[0.12em] ${getPaymentBadgeClasses(getPaymentStatus(booking))}`}
                      >
                        {formatPaymentStatusLabel(getPaymentStatus(booking))}
                      </span>
                    </div>

                    <a
                      href="https://app.cal.com/bookings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-[0.15em] hover:bg-orange-700 transition-colors"
                    >
                      Open
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  {/* Action Footer */}
                  <div className="border-t border-slate-300 mt-2 pt-2 flex items-center justify-between gap-3">
                    <p className="text-[10px] text-slate-500">
                      ID: <span className="font-mono text-slate-700">{booking.booking_id || 'N/A'}</span>
                    </p>
                    <p className="text-[10px] text-slate-500">Created {formatDate(booking.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {!loading && bookings.length > 0 && (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-orange-100 p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Total Bookings</p>
            <p className="text-4xl font-black text-orange-600">{bookings.length}</p>
          </div>

          <div className="bg-white rounded-2xl border border-orange-100 p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Unique Guests</p>
            <p className="text-4xl font-black text-orange-600">
              {new Set(bookings.map((b) => b.user_email)).size}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-orange-100 p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Most Popular Room</p>
            <p className="text-xl font-black text-slate-900">
              {bookings.length > 0
                ? (() => {
                    const rooms = bookings.reduce(
                      (acc, b) => {
                        acc[b.room_id] = (acc[b.room_id] || 0) + 1;
                        return acc;
                      },
                      {} as Record<string, number>
                    );
                    const mostPopular = Object.entries(rooms).sort(([, a], [, b]) => (b as number) - (a as number))[0];
                    return mostPopular ? `${mostPopular[0]} (${mostPopular[1]} bookings)` : 'N/A';
                  })()
                : 'N/A'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
