
import React from 'react';
import { Mail, Phone, MapPin, MessageSquare, Send } from 'lucide-react';
import { RESORT_DATA } from '../constants';

const Contact: React.FC = () => {
  return (
    <section id="contact" className="py-24 bg-cozy" aria-labelledby="contact-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <h2 id="contact-heading" className="text-sm font-bold tracking-widest text-orange-600 uppercase mb-3 text-center sm:text-left">Get In Touch</h2>
            <p className="text-4xl sm:text-5xl font-serif font-black text-slate-900 mb-8 text-center sm:text-left">Visit Us in Bauang</p>
            
            <div className="space-y-8 mt-12">
              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 bg-parchment rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-orange-100">
                  <MapPin className="text-orange-600" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg mb-1">Our Location</h4>
                  <p className="text-slate-600 leading-relaxed">{RESORT_DATA.address}</p>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 bg-parchment rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-orange-100">
                  <Phone className="text-orange-600" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg mb-1">Call for Bookings</h4>
                  <div className="text-slate-600 space-y-1">
                    <p>Mobile: <a href={`tel:${RESORT_DATA.phone.mobile1}`} className="hover:text-orange-600 focus:outline-none focus:underline">{RESORT_DATA.phone.mobile1}</a></p>
                    <p>WhatsApp: <a href={`https://wa.me/63${RESORT_DATA.phone.whatsapp.replace(/^0/, '')}`} rel="noopener noreferrer" target="_blank" className="hover:text-orange-600 font-bold focus:outline-none focus:underline">{RESORT_DATA.phone.whatsapp}</a></p>
                  </div>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 bg-parchment rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-orange-100">
                  <Mail className="text-orange-600" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg mb-1">Email Us</h4>
                  <a href={`mailto:${RESORT_DATA.email}`} className="text-slate-600 hover:text-orange-600 break-all focus:outline-none focus:underline">{RESORT_DATA.email}</a>
                </div>
              </div>
            </div>

            <div className="mt-12 rounded-[2.5rem] overflow-hidden h-64 grayscale contrast-125 border border-orange-200/30 shadow-xl" aria-hidden="true">
               <div className="w-full h-full bg-slate-200 flex items-center justify-center flex-col p-6 text-center">
                  <MapPin size={48} className="text-slate-400 mb-4" />
                  <p className="text-slate-500 font-medium">Interactive Map Experience</p>
               </div>
            </div>
          </div>

          <div className="bg-parchment p-12 rounded-[3rem] border border-orange-200/20 shadow-xl">
            <h3 className="text-3xl font-serif font-bold text-slate-900 mb-8 flex items-center gap-3">
              <MessageSquare className="text-orange-600" aria-hidden="true" />
              Inquiry Form
            </h3>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="full-name" className="block text-xs font-black uppercase tracking-widest text-slate-600 mb-2">Full Name</label>
                  <input 
                    id="full-name"
                    name="name"
                    type="text" 
                    required
                    placeholder="John Doe"
                    className="w-full px-5 py-4 rounded-2xl border border-orange-100 bg-white/30 focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label htmlFor="email-address" className="block text-xs font-black uppercase tracking-widest text-slate-600 mb-2">Email Address</label>
                  <input 
                    id="email-address"
                    name="email"
                    type="email" 
                    required
                    placeholder="john@example.com"
                    className="w-full px-5 py-4 rounded-2xl border border-orange-100 bg-white/30 focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
              <button 
                type="submit"
                aria-label="Submit inquiry form"
                className="w-full py-5 bg-orange-600 text-white rounded-2xl font-bold text-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-orange-600/30 focus:ring-4 focus:ring-orange-200 outline-none"
              >
                Send Message <Send size={20} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
