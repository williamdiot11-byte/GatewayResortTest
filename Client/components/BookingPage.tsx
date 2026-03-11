
import React, { useEffect } from 'react';
import Cal, { getCalApi } from "@calcom/embed-react";
import { User } from '../types';
import { ArrowLeft } from 'lucide-react';

interface BookingPageProps {
  user: User;
  roomId: string;
  onBack: () => void;
}

const BookingPage: React.FC<BookingPageProps> = ({ user, roomId, onBack }) => {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi();
      cal("ui", {
        theme: "light",
        styles: {
          branding: {
            brandColor: "#EA580C", // orange-600
          },
        },
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    })();
  }, []);

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
        <div className="text-right hidden sm:block">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Authenticated as</p>
          <p className="text-slate-900 font-bold">{user.name}</p>
          <p className="text-slate-500 text-sm">{user.email}</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl shadow-orange-900/5 border border-orange-100 overflow-hidden min-h-[700px]">
        <Cal
          calLink="gateway-resort/stay"
          style={{ width: "100%", height: "100%", minHeight: "700px" }}
          config={{
            name: user.name,
            email: user.email,
            notes: `Booking for Room ID: ${roomId}`,
            theme: "light",
          }}
        />
      </div>
      
      <div className="mt-12 p-8 bg-orange-50 rounded-3xl border border-orange-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold">!</div>
          <p className="text-orange-800 text-sm font-medium max-w-xl">
            Your details have been pre-filled for a faster booking experience. Please select your preferred date and time to confirm your reservation.
          </p>
        </div>
        <p className="text-orange-300 text-[10px] font-black uppercase tracking-widest">Powered by Cal.com</p>
      </div>
    </div>
  );
};

export default BookingPage;
