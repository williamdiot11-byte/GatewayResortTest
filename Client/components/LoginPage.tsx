
import React, { useState } from 'react';
import { User } from '../types';

interface LoginPageProps {
  onLogin: (user: User) => void;
  onBack: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && name) {
      onLogin({
        id: 'user-1',
        name,
        email,
        role: email.toLowerCase().includes('admin') ? 'admin' : 'user',
      });
    }
  };

  return (
    <div className="max-w-md mx-auto bg-parchment p-12 rounded-[2.5rem] shadow-xl border border-orange-200/30">
      <h2 className="text-4xl font-serif font-black text-slate-900 mb-8 text-center">Welcome Back</h2>
      <p className="text-slate-600 mb-10 text-center">Please enter your details to continue with your reservation.</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 ml-2">Full Name</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-6 py-4 bg-white border border-orange-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            placeholder="John Doe"
            required
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 ml-2">Email Address</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-6 py-4 bg-white border border-orange-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            placeholder="john@example.com"
            required
          />
        </div>
        
        <button 
          type="submit"
          className="w-full py-5 bg-orange-600 text-white rounded-2xl font-bold text-lg hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
        >
          Sign In
        </button>
      </form>
      
      <button 
        onClick={onBack}
        className="w-full mt-6 text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors"
      >
        Go Back
      </button>
    </div>
  );
};

export default LoginPage;
