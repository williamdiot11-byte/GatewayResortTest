
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      localization={{
        userProfile: {
          profilePage: {
            fileDropAreaHint: '',
            imageFormSubtitle: '',
            imageFormDestructiveActionSubtitle: '',
          },
        },
      }}
      appearance={{
        baseTheme: 'light',
        variables: {
          colorPrimary: '#EA580C',
          colorBackground: '#ffffff',
          colorText: '#0f172a',
          colorInputBackground: '#f1f5f9',
          colorInputText: '#0f172a',
          borderRadius: '0.75rem',
          fontFamily: 'Inter, sans-serif',
        },
        elements: {
          formButtonPrimary: 'bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-xl shadow-sm',
          card: 'bg-white rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-100',
          headerSubtitle: 'text-slate-600',
          formFieldInput: 'rounded-xl border border-slate-200 focus:border-orange-600 focus:ring-orange-600',
          formFieldLabel: 'font-semibold text-slate-700',
          socialButtonsBlockButton:
            'border border-slate-300 hover:border-orange-600 text-slate-900 hover:text-orange-600',
        },
      }}
    >
      <App />
    </ClerkProvider>
  </React.StrictMode>
);
