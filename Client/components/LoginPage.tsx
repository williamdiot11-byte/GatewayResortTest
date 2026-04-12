
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface LoginPageProps {
  onLogin: () => void;
  onBack: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onBack }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (signUpError) throw signUpError;
        setMessage('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        // Auth state listener in App.tsx will set the user; we just navigate.
        onLogin();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-parchment p-12 rounded-[2.5rem] shadow-xl border border-orange-200/30">
      <h2 className="text-4xl font-serif font-black text-slate-900 mb-8 text-center">
        {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
      </h2>
      <p className="text-slate-600 mb-10 text-center">
        {mode === 'signin'
          ? 'Sign in to continue with your reservation.'
          : 'Join us for a seamless resort experience.'}
      </p>

      {error && (
        <div className="mb-6 px-5 py-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-6 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-sm font-medium">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'signup' && (
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 ml-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-6 py-4 bg-white border border-orange-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              placeholder="John Doe"
              required
            />
          </div>
        )}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 ml-2">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-6 py-4 bg-white border border-orange-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            placeholder="john@example.com"
            required
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 ml-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-6 py-4 bg-white border border-orange-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            placeholder="••••••••"
            minLength={6}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-5 bg-orange-600 text-white rounded-2xl font-bold text-lg hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setMessage(null); }}
          className="text-orange-600 text-sm font-bold hover:text-orange-700 transition-colors"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>

      <button
        onClick={onBack}
        className="w-full mt-4 text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors"
      >
        Go Back
      </button>
    </div>
  );
};

export default LoginPage;
