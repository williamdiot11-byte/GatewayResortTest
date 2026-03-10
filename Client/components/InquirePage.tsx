
import React from 'react';
import { Mail, Phone, MapPin, MessageSquare, Send, ArrowLeft } from 'lucide-react';
import { RESORT_DATA } from '../constants';

interface InquirePageProps {
  onBack: () => void;
}

const InquirePage: React.FC<InquirePageProps> = ({ onBack }) => {
  return (
    <section className="bg-cozy min-h-screen py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="mb-12 flex items-center gap-3 text-slate-500 font-black text-xs uppercase tracking-[0.3em] hover:text-orange-600 transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
          
          {/* Information Side */}
          <div className="animate-[fadeInUp_0.8s_ease-out_forwards]">
            <h2 className="text-sm font-bold tracking-widest text-orange-600 uppercase mb-3">Gateway Serenity</h2>
            <h1 className="text-6xl sm:text-7xl font-serif font-black text-slate-900 mb-10 leading-[0.9] tracking-tighter">
              Ready to <br /> <span className="italic font-light">Unwind?</span>
            </h1>
            
            <p className="text-slate-600 text-xl leading-relaxed mb-16 font-serif italic">
              "Every sunset here tells a story. We'd love for you to be a part of the next one."
            </p>

            <div className="space-y-12">
              <div className="flex gap-8 items-start group">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shrink-0 shadow-lg border border-orange-100 group-hover:scale-110 transition-transform">
                  <MapPin className="text-orange-600" size={28} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-widest mb-2 text-slate-400">Our Sanctuary</h4>
                  <p className="text-slate-800 text-xl font-serif">{RESORT_DATA.address}</p>
                </div>
              </div>

              <div className="flex gap-8 items-start group">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shrink-0 shadow-lg border border-orange-100 group-hover:scale-110 transition-transform">
                  <Phone className="text-orange-600" size={28} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-widest mb-2 text-slate-400">Direct Line</h4>
                  <div className="space-y-2">
                    <p className="text-slate-800 text-xl font-serif">{RESORT_DATA.phone.mobile1}</p>
                    <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">WhatsApp: {RESORT_DATA.phone.whatsapp}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-8 items-start group">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shrink-0 shadow-lg border border-orange-100 group-hover:scale-110 transition-transform">
                  <Mail className="text-orange-600" size={28} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-widest mb-2 text-slate-400">Electronic Mail</h4>
                  <p className="text-slate-800 text-xl font-serif break-all">{RESORT_DATA.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div className="animate-[fadeInUp_0.8s_ease-out_0.2s_forwards] opacity-0">
            <div className="bg-white/60 backdrop-blur-sm p-12 sm:p-16 rounded-[4rem] border border-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>
              
              <h3 className="text-4xl font-serif font-black text-slate-900 mb-10 flex items-center gap-4">
                <MessageSquare className="text-orange-600" size={32} />
                Reserve your spot
              </h3>
              
              <form className="space-y-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-2">Full Guest Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Maria Clara"
                      className="w-full px-8 py-5 rounded-[2rem] border-0 bg-white shadow-inner focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all font-serif text-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-2">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="yourname@email.com"
                      className="w-full px-8 py-5 rounded-[2rem] border-0 bg-white shadow-inner focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all font-serif text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-2">How can we help?</label>
                    <textarea 
                      rows={4}
                      placeholder="Tell us about your dates or special requirements..."
                      className="w-full px-8 py-6 rounded-[2.5rem] border-0 bg-white shadow-inner focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all font-serif text-lg resize-none"
                    ></textarea>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="group relative overflow-hidden w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xs tracking-[0.4em] uppercase hover:bg-orange-600 transition-all shadow-2xl flex items-center justify-center gap-4"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    Send Inquiry <Send size={16} />
                  </span>
                  <div className="absolute bottom-0 left-0 w-full h-1.5 bg-orange-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left"></div>
                </button>
              </form>

              <p className="mt-10 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Avg Response Time: <span className="text-orange-600">Under 2 hours</span>
              </p>
            </div>
          </div>

        </div>
      </div>
      
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
};

export default InquirePage;
